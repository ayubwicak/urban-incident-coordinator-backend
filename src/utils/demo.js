import { makeLog } from "./logger.js";
export async function demoDecision(incident) {
  const logs = [];
  const roles = ["triage", "policy", "optimizer", "critic"];
  for (const role of roles)
    logs.push(
      makeLog(
        role,
        `${role} Agent`,
        "thought",
        `Mode demo: simulasi proses ${role}.`,
      ),
    );
  const id = incident.id;
  return {
    logs,
    decision: {
      incidentId: id,
      detectedObjects: ["objek simulasi"],
      severity: "Sedang",
      urgencyScore: 58,
      priorityLevel: "P3",
      primaryAgency: {
        code: "DLH",
        name: "Dinas Lingkungan Hidup",
        reason: "Simulasi demo",
      },
      supportAgencies: [
        { code: "SATPOL", name: "Satpol PP", task: "Koordinasi area" },
      ],
      legalBases: [
        {
          regulation: "Perda Demo",
          article: "Pasal 1",
          summary: "Basis simulasi, bukan dokumen hukum resmi.",
        },
      ],
      spatialAndWeatherContext: {
        weatherSummary: "Cuaca simulasi",
        rainProbability: 20,
        vitalFacilityNearby: "RS Demo",
        distanceToFacilityMeters: 800,
      },
      allocatedTeam: {
        teamId: "TEAM-DEMO",
        teamName: "Tim Demo",
        personnelCount: 4,
        currentLocation: "Posko Demo",
        distanceKm: 1.2,
        etaMinutes: 12,
        contactNumber: "112",
      },
      criticAudit: {
        sopCompliance: true,
        workloadConflict: false,
        budgetApproved: true,
        correctionNote: "Audit demo.",
        confidenceScore: 75,
      },
      draftSPT: {
        sptNumber: `SPT-DEMO-${id.slice(-5)}`,
        date: new Date().toISOString().slice(0, 10),
        signatory: "Supervisor Demo",
        signatoryPosition: "Supervisor",
        assignedTeam: "Tim Demo",
        mission: "Simulasi penanganan insiden.",
        slaHours: 24,
      },
      citizenResponseDraft: {
        recipient: "Pelapor",
        channel: "Aplikasi",
        message: "Laporan Anda diterima (simulasi).",
      },
    },
  };
}
export function demoStates(logs) {
  return ["triage", "policy", "optimizer", "critic"].map((role) => ({
    role,
    name: `${role} Agent`,
    title: role,
    status: "completed",
    progress: 100,
    currentActivity: "Mode demo",
    logs: logs.filter((l) => l.agentRole === role),
    metrics: { demo: true },
  }));
}
