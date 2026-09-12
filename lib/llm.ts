/**
 * Seleção do provedor de modelo (servidor). Ordem: LLM_PROVIDER forçado → OPENROUTER_API_KEY → OPENAI_API_KEY → erro claro.
 * OpenRouter é servida por chat completions (não há endpoint Responses na OpenRouter), por isso `.chat()`.
 * Nunca logar valores de chave.
 */
import { createOpenAI } from "@ai-sdk/openai";
import type { BuiltInAgentClassicConfig } from "@copilotkit/runtime/v2";

export type Provedor = "openrouter" | "openai";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/**
 * Confirmado em GET /api/v1/models em 12/09/2026: openai/gpt-5.6-terra, gpt-5.4-mini e gpt-5.4-nano existem com
 * tools + imagem + structured outputs. O padrão é o mini porque a OpenRouter reserva `max_tokens` × preço de saída
 * antes de responder e recusa com 402 quando o saldo não cobre; com crédito carregado, OPENROUTER_MODEL=openai/gpt-5.6-terra.
 */
export const OPENROUTER_MODEL_PADRAO = "openai/gpt-5.4-mini";
export const OPENROUTER_FALLBACK_PADRAO = ["openai/gpt-5.4-nano"];
export const OPENAI_MODEL_PADRAO = "gpt-5.6-terra";

type Env = Record<string, string | undefined>;

export function resolverProvedor(env: Env = process.env): Provedor {
  const forcado = env.LLM_PROVIDER?.trim().toLowerCase();
  if (forcado === "openrouter" || forcado === "openai") {
    if (forcado === "openrouter" && !env.OPENROUTER_API_KEY) throw new Error("LLM_PROVIDER=openrouter, mas OPENROUTER_API_KEY está ausente em .env.local");
    if (forcado === "openai" && !env.OPENAI_API_KEY) throw new Error("LLM_PROVIDER=openai, mas OPENAI_API_KEY está ausente em .env.local");
    return forcado;
  }
  if (forcado) throw new Error(`LLM_PROVIDER inválido "${forcado}": use openrouter ou openai`);
  if (env.OPENROUTER_API_KEY) return "openrouter";
  if (env.OPENAI_API_KEY) return "openai";
  throw new Error("Nenhuma chave de modelo: defina OPENROUTER_API_KEY ou OPENAI_API_KEY em .env.local");
}

export function provedorDisponivel(env: Env = process.env): Provedor | null {
  try {
    return resolverProvedor(env);
  } catch {
    return null;
  }
}

/** Modelo principal e lista de failover da OpenRouter (corpo `models`). */
export function modeloOpenRouter(env: Env = process.env): { id: string; fallbacks: string[] } {
  const id = env.OPENROUTER_MODEL?.trim() || OPENROUTER_MODEL_PADRAO;
  const lista = env.OPENROUTER_FALLBACK_MODELS === undefined ? OPENROUTER_FALLBACK_PADRAO : env.OPENROUTER_FALLBACK_MODELS.split(",");
  const fallbacks = lista.map((m) => m.trim()).filter((m) => m && m !== id);
  return { id, fallbacks: Array.from(new Set(fallbacks)) };
}

/** Modelo da OpenAI direta, aceitando COPILOT_MODEL em "openai:gpt-x", "openai/gpt-x" ou "gpt-x". */
export function modeloOpenAI(env: Env = process.env): string {
  return (env.COPILOT_MODEL ?? OPENAI_MODEL_PADRAO).trim().replace(/^openai[:/]/, "");
}

export function cabecalhosOpenRouter(env: Env = process.env): Record<string, string> {
  const h: Record<string, string> = {};
  if (env.OPENROUTER_SITE_URL) h["HTTP-Referer"] = env.OPENROUTER_SITE_URL;
  if (env.OPENROUTER_SITE_NAME) h["X-Title"] = env.OPENROUTER_SITE_NAME;
  return h;
}

/** Injeta `models` (failover da OpenRouter) no corpo JSON de cada chamada; o provider da AI SDK não expõe extraBody. */
export function comFallbackOpenRouter(body: string, fallbacks: string[]): string {
  if (fallbacks.length === 0) return body;
  try {
    const b = JSON.parse(body) as Record<string, unknown>;
    if (b && typeof b === "object" && typeof b.model === "string" && !Array.isArray(b.models)) {
      return JSON.stringify({ ...b, models: fallbacks });
    }
  } catch {
    /* corpo não é JSON: envia como veio */
  }
  return body;
}

function fetchComFallback(fallbacks: string[]): typeof fetch {
  return (input, init) => {
    if (init && typeof init.body === "string") init = { ...init, body: comFallbackOpenRouter(init.body, fallbacks) };
    return fetch(input, init);
  };
}

/** Modelo para o BuiltInAgent do CopilotKit. */
export function criarModeloAgente(env: Env = process.env): BuiltInAgentClassicConfig["model"] {
  const provedor = resolverProvedor(env);
  if (provedor === "openrouter") {
    const { id, fallbacks } = modeloOpenRouter(env);
    const provider = createOpenAI({
      name: "openrouter",
      baseURL: OPENROUTER_BASE_URL,
      apiKey: env.OPENROUTER_API_KEY,
      headers: cabecalhosOpenRouter(env),
      fetch: fetchComFallback(fallbacks),
    });
    return provider.chat(id);
  }
  return `openai/${modeloOpenAI(env)}`;
}

/** Descrição segura para log/diagnóstico (sem chave). */
export function descreverModelo(env: Env = process.env): { provedor: Provedor | null; modelo: string; fallbacks: string[] } {
  const provedor = provedorDisponivel(env);
  if (provedor === "openrouter") {
    const { id, fallbacks } = modeloOpenRouter(env);
    return { provedor, modelo: id, fallbacks };
  }
  if (provedor === "openai") return { provedor, modelo: modeloOpenAI(env), fallbacks: [] };
  return { provedor: null, modelo: "—", fallbacks: [] };
}
