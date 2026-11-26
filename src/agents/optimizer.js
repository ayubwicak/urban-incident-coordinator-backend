import { getWeather } from "../services/weather.js";
import { nearestFacility } from "../services/facilities.js";
import { allocateTeam } from "../services/teams.js";
import {
  urgencyScore,
  priorityFromScore,
  severityFromScore,
} from "../utils/scoring.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
const auditPrepSchema = z.object({
  mission: z.string(),
  citizenMessage: z.string(),
  budgetEstimated: z.number().min(0),
});
export async function runOptimizer(incident, triage, policy, attempt) {
  const lat = triage.latitude ?? incident.latitude,
    lon = triage.longitude ?? incident.longitude;
  const [weather, vital] = await Promise.all([
    getWeather(lat, lon),
    Promise.resolve(nearestFacility(lat, lon)),
  ]);
  const team = allocateTeam(lat, lon);
  const S = triage.severityScore,
    V = vital.score,
    W = weather.score,
    R = triage.impactRiskScore;
  const U = urgencyScore(S, V, W, R);
  const priorityLevel = priorityFromScore(U);
  let prep = {
    mission: `Penanganan ${triage.category} di ${incident.location || "lokasi laporan"}.`,
    citizenMessage:
      "Laporan Anda telah diterima dan sedang ditinjau oleh petugas.",
    budgetEstimated: 1000000,
  };
  try {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-3.8-flash",
      temperature: 0.2,
    }).withStructuredOutput(auditPrepSchema);
    prep = await model.invoke(
      `Buat mission ringkas dan pesan warga yang empatik serta estimasi anggaran dalam rupiah untuk laporan ini.\n${incident.description}\n${JSON.stringify(policy)}`,
    );
  } catch {
    /* deterministic fallback */
  }
  return {
    S,
    V,
    W,
    R,
    U,
    priorityLevel,
    severity: severityFromScore(S),
    weather,
    vital,
    team,
    prep,
    attempt,
  };
}
