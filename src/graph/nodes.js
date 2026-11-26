import { runTriage } from "../agents/triage.js";
import { runPolicy } from "../agents/policy.js";
import { runOptimizer } from "../agents/optimizer.js";
import { runCritic } from "../agents/critic.js";
import { makeLog } from "../utils/logger.js";

export async function triageNode(s) {
    const name = "Triage Agent";
    const t = await runTriage(s.incident);

    return {
        triageResult: t,
        logs: [
            makeLog(
                "triage",
                name,
                "thought",
                t.summary,
                {
                    category: t.category,
                    S: t.severityScore,
                    R: t.impactRiskScore
                }
            ),
            makeLog(
                "triage",
                name,
                "tool_result",
                "Analisis laporan selesai."
            )
        ]
    };
}

export async function policyNode(s) {
    const name = "Policy Retrieval Agent";
    const p = await runPolicy(s.incident, s.triageResult);

    return {
        policyResult: p,
        logs: [
            makeLog(
                "policy",
                name,
                "tool_call",
                "Retrieval dokumen kebijakan lokal."
            ),
            makeLog(
                "policy",
                name,
                "tool_result",
                `Ditemukan ${p.retrievedDocs.length} dokumen.`,
                { legalBases: p.legalBases }
            )
        ]
    };
}

export async function optimizerNode(s) {
    const name = "Incident Optimizer Agent";

    const o = await runOptimizer(
        s.incident,
        s.triageResult,
        s.policyResult,
        s.attempt
    );

    return {
        optimizerResult: o,
        attempt: s.attempt + 1,
        logs: [
            makeLog(
                "optimizer",
                name,
                "thought",
                `Skor urgensi ${o.U}; prioritas ${o.priorityLevel}.`,
                {
                    S: o.S,
                    V: o.V,
                    W: o.W,
                    R: o.R
                }
            ),
            makeLog(
                "optimizer",
                name,
                "tool_result",
                `Cuaca: ${o.weather.summary}; fasilitas: ${
                    o.vital.facility?.name || "tidak diketahui"
                }; tim: ${o.team?.teamName || "tidak tersedia"}`
            )
        ]
    };
}

export async function criticNode(s) {
    const name = "Critic Audit Agent";

    const c = await runCritic(
        s.policyResult,
        s.optimizerResult,
        s.attempt
    );

    const passed =
        c.citation_valid &&
        c.budget_available &&
        c.team_not_overloaded;

    return {
        criticResult: c,
        flagged: !passed && s.attempt >= 3,
        logs: [
            makeLog(
                "critic",
                name,
                "critic_audit",
                passed
                    ? "Audit lolos."
                    : "Audit gagal; evaluasi retry/escalation.",
                {
                    ...c,
                    passed,
                    attempt: s.attempt
                }
            )
        ]
    };
}

export async function decisionNode(s) {
    const o = s.optimizerResult;
    const p = s.policyResult;
    const c = s.criticResult;
    const t = s.triageResult;

    const incident = s.incident;
    const team = o.team;
    const date = new Date();

    const decision = {
        incidentId: incident.id,
        detectedObjects: t.detectedObjects,
        severity: o.severity,
        urgencyScore: o.U,
        priorityLevel: o.priorityLevel,

        primaryAgency: p.primaryAgency,
        supportAgencies: p.supportAgencies,
        legalBases: p.legalBases,

        spatialAndWeatherContext: {
            weatherSummary: o.weather.summary,
            rainProbability: o.weather.rainProbability,
            vitalFacilityNearby:
                o.vital.facility?.name || "Tidak diketahui",
            distanceToFacilityMeters:
                o.vital.distanceKm == null
                    ? null
                    : Math.round(o.vital.distanceKm * 1000)
        },

        allocatedTeam: team
            ? {
                teamId: team.teamId,
                teamName: team.teamName,
                personnelCount: team.personnelCount,
                currentLocation: team.currentLocation,
                distanceKm: team.distanceKm,
                etaMinutes: team.etaMinutes,
                contactNumber: team.contactNumber
            }
            : {
                teamId: "UNALLOCATED",
                teamName: "Tim belum tersedia",
                personnelCount: 0,
                currentLocation: "-",
                distanceKm: 0,
                etaMinutes: 0,
                contactNumber: "112"
            },

        criticAudit: {
            sopCompliance: c.citation_valid,
            workloadConflict: !c.team_not_overloaded,
            budgetApproved: c.budget_available,
            correctionNote: c.correctionNote,
            confidenceScore: c.confidenceScore
        },

        draftSPT: {
            sptNumber: `SPT-${date.getFullYear()}-${incident.id.slice(-6).toUpperCase()}`,
            date: date.toISOString().slice(0, 10),
            signatory: "Supervisor Operasional",
            signatoryPosition: "Kepala Unit",
            assignedTeam: team?.teamName || "Belum dialokasikan",
            mission: o.prep.mission,
            slaHours:
                o.priorityLevel === "P1"
                    ? 2
                    : o.priorityLevel === "P2"
                        ? 8
                        : 24
        },

        citizenResponseDraft: {
            recipient: "Pelapor",
            channel: "Aplikasi",
            message: o.prep.citizenMessage
        }
    };

    return {
        decision,
        logs: [
            makeLog(
                "critic",
                "Critic Audit Agent",
                "final_decision",
                s.flagged
                    ? "Ditandai untuk eskalasi supervisor."
                    : "Draft keputusan disiapkan untuk persetujuan manusia.",
                { decision }
            )
        ]
    };
}