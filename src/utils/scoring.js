export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (n) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function urgencyScore(S, V, W, R) {
  return Math.round(0.35 * S + 0.25 * V + 0.25 * W + 0.15 * R);
}
export function priorityFromScore(U) {
  return U >= 80 ? "P1" : U >= 60 ? "P2" : "P3";
}
export function severityFromScore(S) {
  return S >= 85
    ? "Kritis"
    : S >= 65
      ? "Tinggi"
      : S >= 35
        ? "Sedang"
        : "Rendah";
}
