import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
const schema = z.object({
  category: z.string(),
  detectedObjects: z.array(z.string()),
  severityScore: z.number().min(0).max(100),
  impactRiskScore: z.number().min(0).max(100),
  summary: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export async function runTriage(incident) {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.8-flash",
    temperature: 0.2,
  }).withStructuredOutput(schema);
  const text = `Analisis laporan insiden perkotaan. Keluarkan kategori, objek, skor severity S (0-100), impact risk R (0-100), ringkasan, dan koordinat jika tersedia. Jangan mengarang koordinat.\nLaporan: ${incident.description}\nLokasi: ${incident.location || "tidak disebutkan"}\nKoordinat: ${incident.latitude ?? ""}, ${incident.longitude ?? ""}`;
  const content = [{ type: "text", text }];
  if (incident.imageUrl)
    content.push({ type: "image_url", image_url: incident.imageUrl });
  return model.invoke([{ role: "user", content }]);
}
