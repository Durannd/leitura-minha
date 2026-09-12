/**
 * Interpretação de comando por LLM. É o segundo estágio: o cliente já tentou o léxico determinístico
 * e só chega aqui quando não entendeu. Nunca devolve 500 — falha vira confiança 0, que a barra sabe tratar.
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { OPENROUTER_BASE_URL, cabecalhosOpenRouter, modeloOpenRouter, provedorDisponivel } from "@/lib/llm";
import { COMANDO_VAZIO, ComandoSchema, SISTEMA_COMANDO } from "@/lib/comando/schema";

export const runtime = "nodejs";
export const maxDuration = 20;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { frase?: unknown } | null;
  const frase = typeof body?.frase === "string" ? body.frase.slice(0, 400).trim() : "";
  const falhou = (motivo: string) => Response.json({ ...COMANDO_VAZIO, naoEntendido: frase, motivo }, { headers: CORS });

  if (!frase) return falhou("frase vazia");
  if (provedorDisponivel() !== "openrouter") return falhou("sem chave de modelo");

  try {
    const { id, fallbacks } = modeloOpenRouter();
    const client = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: OPENROUTER_BASE_URL, defaultHeaders: cabecalhosOpenRouter() });
    const r = await client.chat.completions.parse({
      model: id,
      messages: [
        { role: "system", content: SISTEMA_COMANDO },
        { role: "user", content: frase },
      ],
      response_format: zodResponseFormat(ComandoSchema, "comando"),
      max_tokens: 400,
      temperature: 0,
      ...(fallbacks.length ? ({ models: fallbacks } as object) : {}),
    });
    const cmd = r.choices[0]?.message.parsed;
    return cmd ? Response.json(cmd, { headers: CORS }) : falhou("modelo não devolveu comando");
  } catch (e) {
    console.error("[comando]", (e as Error).message);
    return falhou((e as Error).message);
  }
}
