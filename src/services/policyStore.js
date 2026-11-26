import { POLICIES } from "../data/policies.js";
export function retrievePolicies(text = "") {
  const terms = text
    .toLowerCase()
    .split(/[^a-z0-9À-ÿ]+/)
    .filter((x) => x.length > 2);
  const scored = POLICIES.map((p) => ({
    ...p,
    score: p.keywords.reduce(
      (n, k) =>
        n +
        (terms.some(
          (t) => k.toLowerCase().includes(t) || t.includes(k.toLowerCase()),
        )
          ? 1
          : 0),
      0,
    ),
  })).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}
