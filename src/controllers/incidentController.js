
import { randomUUID } from "node:crypto";
import { incidentGraph } from "../graph/graph.js";
import { makeLog } from "../utils/logger.js";
import { demoDecision, demoStates } from "../utils/demo.js";

export const incidents = new Map();

export function createIncident(req, res) {
    const { description, location, latitude, longitude, imageUrl } = req.body || {};

    if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({
            error: "description wajib berupa string tidak kosong"
        });
    }

    const incident = {
        id: randomUUID(),
        description: description.trim(),
        location: location || null,
        latitude: latitude == null ? undefined : Number(latitude),
        longitude: longitude == null ? undefined : Number(longitude),
        imageUrl: imageUrl || undefined,
        createdAt: new Date().toISOString(),
        status: "queued"
    };

    incidents.set(incident.id, incident);

    return res.status(201).json({ incident });
}

function writeEvent(res, event, payload) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

const agentNames = {
    triage: "Triage Agent",
    policy: "Policy Agent",
    optimizer: "Optimizer Agent",
    critic: "Critic Agent"
};

function makeAgentStates(logs, currentNode = null, flagged = false) {
    const roles = ["triage", "policy", "optimizer", "critic"];

    return roles.map((role) => {
        const roleLogs = logs.filter((l) => l.agentRole === role);

        let status = "pending";
        let progress = 0;
        let activity = "Menunggu proses";

        if (role === currentNode) {
            status = "running";
            progress = 50;
            activity = "Sedang menjalankan analisis";
        } else if (roleLogs.length > 0) {
            status = flagged && role === "critic" ? "flagged" : "completed";
            progress = 100;
            activity = "Selesai";
        }

        return {
            role,
            name: agentNames[role],
            title: role,
            status,
            progress,
            currentActivity: activity,
            logs: roleLogs,
            metrics: {
                logCount: roleLogs.length
            }
        };
    });
}

export async function streamIncident(req, res) {
    const id = req.query.incident_id;
    const incident = incidents.get(id);

    if (!incident) {
        return res.status(404).json({
            error: "incident_id tidak ditemukan"
        });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let disconnected = false;

    res.on("close", () => {
        disconnected = true;
    });

    const send = (event, payload) => {
        if (!disconnected) {
            writeEvent(res, event, payload);
        }
    };

    const initialLogs = Object.entries(agentNames).map(([role, name]) =>
        makeLog(role, name, "thought", "Menunggu proses agent.")
    );

    send("message", {
        type: "state_update",
        states: makeAgentStates([], null)
    });

    initialLogs.forEach((log) => {
        send("message", {
            type: "log",
            log
        });
    });

    try {
        const latest = {
            incident,
            triageResult: {},
            policyResult: {},
            optimizerResult: {},
            criticResult: {},
            attempt: 0,
            flagged: false,
            decision: null,
            logs: []
        };

        try {
            for await (const chunk of await incidentGraph.stream(
                {
                    incident,
                    attempt: 0,
                    logs: []
                },
                {
                    streamMode: "updates"
                }
            )) {
                for (const [nodeName, update] of Object.entries(chunk)) {
                    console.log(`[GRAPH] ${nodeName} completed`);

                    Object.assign(latest, update);

                    if (update.logs) {
                        latest.logs = latest.logs.concat(update.logs);

                        update.logs.forEach((log) => {
                            send("message", {
                                type: "log",
                                log
                            });
                        });
                    }

                    const role =
                        nodeName === "finalize"
                            ? "critic"
                            : nodeName;

                    send("message", {
                        type: "state_update",
                        states: makeAgentStates(
                            latest.logs,
                            null,
                            latest.flagged
                        )
                    });

                    send("message", {
                        type: "agent_progress",
                        agent: role,
                        node: nodeName,
                        status: "completed"
                    });
                }
            }
        } catch (error) {
            console.error("[GRAPH ERROR]", error);

            if (process.env.DEMO_MODE !== "true") {
                throw error;
            }

            const demo = await demoDecision(incident);
            latest.decision = demo.decision;
            latest.flagged = false;
            latest.logs = demo.logs;
        }

        if (
            process.env.DEMO_MODE === "true" &&
            !latest.decision
        ) {
            const demo = await demoDecision(incident);
            latest.decision = demo.decision;
            latest.logs = demo.logs;
        }

        const flagged = Boolean(latest.flagged);

        send("message", {
            type: "state_update",
            states: makeAgentStates(
                latest.logs,
                null,
                flagged
            )
        });

        send("message", {
            type: "decision_ready",
            decision: latest.decision
        });

        incident.status = flagged ? "flagged" : "completed";
        incident.decision = latest.decision;

    } catch (err) {
        console.error("[PIPELINE ERROR]", err);

        const log = makeLog(
            "critic",
            "System",
            "thought",
            `Pipeline gagal: ${err.message}`,
            { error: true }
        );

        send("message", {
            type: "log",
            log
        });

        send("message", {
            type: "error",
            error: "Pipeline gagal. Coba lagi atau aktifkan DEMO_MODE."
        });

        incident.status = "failed";

    } finally {
        if (!disconnected) {
            res.end();
        }
    }
}
