/**
 * LLM Provider Abstraction with fallback chain
 *
 * Supports multiple providers and multiple API keys per provider.
 * Uses generateText + manual JSON parsing for universal compatibility
 * (avoids json_schema response_format which many providers don't support).
 *
 * Configure via env vars:
 *   AI_PROVIDERS=groq,gemini  (comma-separated, first = primary, rest = fallbacks)
 *   GROQ_API_KEY=key1,key2    (comma-separated, each tried in order)
 *   GEMINI_API_KEY=key1,key2
 *
 * Legacy single-provider mode:
 *   AI_PROVIDER=groq
 *   GROQ_API_KEY=single_key
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";

interface ProviderConfig {
  name: string;
  model: string;
  apiKey: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
};

const API_KEY_ENV: Record<string, string> = {
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
};

function getProviderChain(): ProviderConfig[] {
  const modelOverride = process.env.AI_MODEL;
  const chain: ProviderConfig[] = [];

  const providersEnv = process.env.AI_PROVIDERS;
  const providerNames = providersEnv
    ? providersEnv.split(",").map((p) => p.trim().toLowerCase()).filter((p) => p in API_KEY_ENV)
    : [(process.env.AI_PROVIDER ?? "gemini").toLowerCase()];

  const primaryName = providerNames[0];

  for (const name of providerNames) {
    const keysRaw = process.env[API_KEY_ENV[name]] ?? "";
    const keys = keysRaw.split(",").map((k) => k.trim()).filter(Boolean);
    const model = (modelOverride && name === primaryName) ? modelOverride : DEFAULT_MODELS[name];

    for (const apiKey of keys) {
      chain.push({ name, model, apiKey });
    }
  }

  return chain;
}

function getModelForProvider(config: ProviderConfig) {
  if (config.name === "groq") {
    const groq = createGroq({ apiKey: config.apiKey });
    return groq(config.model);
  }
  if (config.name === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    return google(config.model);
  }
  throw new Error(`Unsupported provider: ${config.name}`);
}

function maskKey(key: string): string {
  if (key.length < 12) return "***";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

export async function callLLM(
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  const chain = getProviderChain();
  if (chain.length === 0) return null;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      const { text } = await generateText({
        model: getModelForProvider(provider),
        system: systemPrompt,
        prompt: userMessage,
        maxOutputTokens: 1024,
      });
      return text ?? null;
    } catch (err) {
      console.error(`[LLM] ${provider.name} (${maskKey(provider.apiKey)}) failed:`, err instanceof Error ? err.message : err);
      if (i < chain.length - 1) {
        console.log(`[LLM] Falling back to ${chain[i + 1].name} (${maskKey(chain[i + 1].apiKey)})...`);
      }
    }
  }

  return null;
}

export async function callLLMStructured<T>(
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  const chain = getProviderChain();
  if (chain.length === 0) return null;

  // Use Zod v4's built-in toJSONSchema() for the schema description
  const jsonSchema = (schema as unknown as { toJSONSchema: () => Record<string, unknown> }).toJSONSchema();
  const structuredSystemPrompt = `${systemPrompt}

You MUST respond with ONLY valid JSON matching this exact schema. No markdown, no explanation, no code fences — just raw JSON:
${JSON.stringify(jsonSchema, null, 2)}`;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      const { text } = await generateText({
        model: getModelForProvider(provider),
        system: structuredSystemPrompt,
        prompt: userMessage,
        maxOutputTokens: 4096,
      });

      const jsonStr = extractJSON(text);
      if (!jsonStr) {
        throw new Error("No valid JSON found in LLM response");
      }

      const parsed = JSON.parse(jsonStr);
      return schema.parse(parsed);
    } catch (err) {
      console.error(`[LLM] ${provider.name} (${maskKey(provider.apiKey)}) failed:`, err instanceof Error ? err.message : err);
      if (i < chain.length - 1) {
        console.log(`[LLM] Falling back to ${chain[i + 1].name} (${maskKey(chain[i + 1].apiKey)})...`);
      }
    }
  }

  return null;
}

function extractJSON(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Direct parse
  try { JSON.parse(trimmed); return trimmed; } catch {}

  // Markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { JSON.parse(fenceMatch[1].trim()); return fenceMatch[1].trim(); } catch {}
  }

  // First { to last }
  const fb = trimmed.indexOf("{"), lb = trimmed.lastIndexOf("}");
  if (fb !== -1 && lb > fb) {
    const c = trimmed.slice(fb, lb + 1);
    try { JSON.parse(c); return c; } catch {}
  }

  // First [ to last ]
  const fk = trimmed.indexOf("["), lk = trimmed.lastIndexOf("]");
  if (fk !== -1 && lk > fk) {
    const c = trimmed.slice(fk, lk + 1);
    try { JSON.parse(c); return c; } catch {}
  }

  return null;
}

export function isLLMEnabled(): boolean {
  return getProviderChain().length > 0;
}
