import { ChatOpenAI } from "@langchain/openai";

/**
 * Satu tempat konfigurasi model untuk semua agent.
 * Memakai 9router yang kompatibel dengan API OpenAI.
 */
export function createChatModel({ temperature = 0.2 } = {}) {
  const apiKey = process.env.ROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ROUTER_API_KEY belum diatur. Isi di file .env dengan API key 9router.",
    );
  }

  return new ChatOpenAI({
    apiKey,
    configuration: {
      baseURL: process.env.ROUTER_BASE_URL || "http://localhost:20128/v1",
    },
    model: process.env.ROUTER_MODEL || "nous/tencent/hy4-flash:free",
    temperature,
    maxRetries: 2,
  });
}
