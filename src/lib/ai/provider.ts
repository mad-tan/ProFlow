/**
 * LLM Provider Abstraction
 *
 * Defaults to Google Gemini (free tier: 15 RPM, 1500 RPD, 1M TPD).
 * Swap provider by setting AI_PROVIDER env var.
 * Swap model by setting AI_MODEL env var.
 *
 * Supported AI_PROVIDER values: "gemini" (default)
 * Future: "openai", "anthropic", "groq"
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";

const AI_PROVIDER = process.env.AI_PROVIDER ?? "gemini";
const AI_MODEL = process.env.AI_MODEL ?? "gemini-1.5-flash";

function getModel() {
  if (AI_PROVIDER === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY ?? "",
    });
    return google(AI_MODEL);
  }
  // Future providers: openai, anthropic, groq — add here
  throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
}

/**
 * Generate a plain text response from the LLM.
 * Returns null if the API key is missing or the call fails.
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      prompt: userMessage,
      maxOutputTokens: 1024,
    });
    return text ?? null;
  } catch (err) {
    console.error("[LLM] callLLM error:", err);
    return null;
  }
}

/**
 * Generate a structured JSON object from the LLM.
 * Returns null if the API key is missing or the call fails.
 */
export async function callLLMStructured<T>(
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { object } = await generateObject({
      model: getModel(),
      system: systemPrompt,
      prompt: userMessage,
      schema,
    });
    return object ?? null;
  } catch (err) {
    console.error("[LLM] callLLMStructured error:", err);
    return null;
  }
}

export function isLLMEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
