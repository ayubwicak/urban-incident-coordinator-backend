export async function getWeather(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { summary: "Koordinat tidak tersedia; kondisi cuaca simulasi.", rainProbability: 0, score: 20 };
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_days=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(7000) }); if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
        const json = await res.json(); const probabilities = json.hourly?.precipitation_probability || []; const rainProbability = probabilities.length ? Math.max(...probabilities.slice(0, 6)) : 0;
        return { summary: `Probabilitas hujan maksimum 6 jam awal: ${rainProbability}%.`, rainProbability, score: Math.round(Math.min(100, rainProbability * 0.8)) };
    } catch { return { summary: "Data cuaca tidak dapat diambil; skor cuaca fallback.", rainProbability: 0, score: 15 }; }
}
