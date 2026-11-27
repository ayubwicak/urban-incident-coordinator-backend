import { createChatModel } from "./model.js";
import { z } from "zod";
const schema = z.object({
  category: z.string(),
  detectedObjects: z.array(z.string()),
  severityScore: z.number().min(0).max(100),
  impactRiskScore: z.number().min(0).max(100),
  summary: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});
export async function runTriage(incident) {
  const model = createChatModel({ temperature: 0.2 }).withStructuredOutput(
    schema,
  );
  const text = `Analisis laporan insiden perkotaan. Keluarkan kategori, objek, skor severity S (0-100), impact risk R (0-100), ringkasan, dan koordinat jika tersedia. Jangan mengarang koordinat.\nLaporan: ${incident.description}\nLokasi: ${incident.location || "tidak disebutkan"}\nKoordinat: ${incident.latitude ?? ""}, ${incident.longitude ?? ""}`;
  const content = incident.imageUrl
    ? [
        { type: "text", text },
        { type: "image_url", image_url: { url: incident.imageUrl } },
      ]
    : text;
  return model.invoke([{ role: "user", content }]);
}
