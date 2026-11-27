import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
const schema = z.object({
  citation_valid: z.boolean(),
  budget_available: z.boolean(),
  team_not_overloaded: z.boolean(),
  correctionNote: z.string(),
  confidenceScore: z.number().min(0).max(100),
});
export async function runCritic(policy, optimizer, attempt) {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    temperature: 0,
  }).withStructuredOutput(schema);
  const prompt = `Audit tiga indikator. citation_valid harus true bila legalBases berisi setidaknya satu basis yang bersumber dari retrieval dokumen; budget_available true bila estimasi<=5000000; team_not_overloaded true bila tim tersedia dan personel >=3. Jangan mengubah aturan deterministik tersebut.\nLegal: ${JSON.stringify(policy.legalBases)}\nTim: ${JSON.stringify(optimizer.team)}\nEstimasi: ${optimizer.prep.budgetEstimated}\nAttempt: ${attempt}`;
  try {
    return await model.invoke(prompt);
  } catch {
    return {
      citation_valid: policy.legalBases.length > 0,
      budget_available: optimizer.prep.budgetEstimated <= 5000000,
      team_not_overloaded: Boolean(
        optimizer.team && optimizer.team.personnelCount >= 3,
      ),
      correctionNote:
        "Audit fallback menggunakan pemeriksaan deterministik karena model audit tidak tersedia.",
      confidenceScore: 70,
    };
  }
}
