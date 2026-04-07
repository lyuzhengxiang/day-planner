import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openai?: OpenAI };

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (!globalForOpenAI.openai) {
    globalForOpenAI.openai = new OpenAI({ apiKey });
  }

  return globalForOpenAI.openai;
}
