import { randomUUID } from "node:crypto";
export function makeLog(agentRole, agentName, type, content, meta = {}) {
  return {
    id: randomUUID(),
    agentRole,
    agentName,
    timestamp: new Date().toISOString(),
    type,
    content,
    meta,
  };
}
