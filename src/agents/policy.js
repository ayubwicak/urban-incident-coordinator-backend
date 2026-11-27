import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { retrievePolicies } from "../services/policyStore.js";
import { z } from "zod";
const schema = z.object({
  primaryAgency: z.object({
    code: z.string(),
    name: z.string(),
    reason: z.string(),
  }),
  supportAgencies: z.array(
    z.object({ code: z.string(), name: z.string(), task: z.string() }),
  ),
  legalBases: z.array(
    z.object({
      regulation: z.string(),
      article: z.string(),
      summary: z.string(),
    }),
  ),
});
export async function runPolicy(incident, triage) {
  const docs = retrievePolicies(`${incident.description} ${triage.category}`);
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0.1,
  }).withStructuredOutput(schema);
  const prompt = `Pilih dinas berdasarkan dokumen lokal. Hanya gunakan dasar hukum dari dokumen yang disediakan; dokumen adalah data DEMO dan bukan hukum terverifikasi. Code dinas buat kode singkat.\nInsiden: ${incident.description}\nKategori: ${triage.category}\nDokumen: ${JSON.stringify(docs)}`;
  const result = await model.invoke(prompt);
  return { ...result, retrievedDocs: docs };
}
