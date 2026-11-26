import { FACILITIES } from "../data/facilities.js";
import { haversineKm } from "../utils/scoring.js";
export function nearestFacility(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon))
    return { facility: null, distanceKm: null, score: 20 };
  const nearest = FACILITIES.map((f) => ({
    ...f,
    distanceKm: haversineKm(lat, lon, f.lat, f.lon),
  })).sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const score = Math.round(Math.max(0, 100 - nearest.distanceKm * 12));
  return { facility: nearest, distanceKm: nearest.distanceKm, score };
}
