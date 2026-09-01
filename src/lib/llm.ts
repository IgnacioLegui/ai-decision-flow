import OpenAI from "openai";

export function getLlmClient() {
  return new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
  });
}

export const LLM_MODEL = process.env.LLM_MODEL ?? "openrouter/free";
