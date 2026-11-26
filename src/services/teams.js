import { TEAMS } from "../data/teams.js";
import { haversineKm } from "../utils/scoring.js";
export function allocateTeam(lat, lon) {
  const available = TEAMS.filter((t) => t.available);
  if (!available.length) return null;
  const candidates = available
    .map((t) => ({
      ...t,
      distanceKm:
        Number.isFinite(lat) && Number.isFinite(lon)
          ? haversineKm(lat, lon, t.lat, t.lon)
          : 1,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const t = candidates[0];
  return {
    ...t,
    distanceKm: Number(t.distanceKm.toFixed(2)),
    etaMinutes: Math.max(5, Math.round(t.distanceKm * 4 + 8)),
  };
}
