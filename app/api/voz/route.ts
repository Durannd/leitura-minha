/**
 * Voz pela OpenRouter: o áudio vai inteiro para um modelo multimodal e volta como comando estruturado.
 * Não há transcrição intermediária — o modelo ouve e já devolve o objeto. Um passo em vez de dois,
 * e o sotaque é problema do modelo, não de um ASR genérico.
 *
 * A OpenRouter não expõe /audio/transcriptions nem /audio/speech (ambos respondem 400): o caminho
 * suportado é `input_audio` dentro de chat completions, em modelos com a modalidade de entrada `audio`.
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { OPENROUTER_BASE_URL, cabecalhosOpenRouter, modeloOpenRouter, provedorDisponivel } from "@/lib/llm";
import { COMANDO_VAZIO, ComandoSchema, SISTEMA_COMANDO } from "@/lib/comando/schema";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * Confirmado em GET /api/v1/models em 12/09/2026: aceita `audio` na entrada, suporta structured outputs
 * e custa US$ 0,0000003/token de prompt — cerca de um décimo do gpt-5.4-mini. Alternativas com áudio:
 * google/gemini-3.8-flash (melhor, mais caro) e openai/gpt-audio-mini (também gera áudio de volta).
 */
const MODELO_VOZ_PADRAO = "google/gemini-3.5-flash-lite";
const FALLBACK_VOZ = ["google/gemini-3.1-flash-lite", "openai/gpt-audio-mini"];
const LIMITE_BASE64 = 6_000_000; // ~4,5 MB de áudio

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

const FORMATOS = new Set(["wav", "mp3", "webm", "ogg", "m4a", "flac"]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { audioBase64?: unknown; formato?: unknown } | null;
  const audioBase64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
  const formato = typeof body?.formato === "string" && FORMATOS.has(body.formato) ? body.formato : "webm";

  const falhou = (motivo: string, status = 200) =>
    Response.json({ ...COMANDO_VAZIO, motivo }, { status, headers: CORS });

  if (!audioBase64) return falhou("áudio ausente", 400);
  if (audioBase64.length > LIMITE_BASE64) return falhou("áudio grande demais (máx. ~4,5 MB)", 413);
  if (provedorDisponivel() !== "openrouter") return falhou("sem chave de modelo");

  const modelo = process.env.VOZ_MODEL?.trim() || MODELO_VOZ_PADRAO;
  const fallbacks = (process.env.VOZ_FALLBACK_MODELS?.split(",").map((m) => m.trim()).filter(Boolean) ?? FALLBACK_VOZ).filter((m) => m !== modelo);

  try {
    const client = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: OPENROUTER_BASE_URL, defaultHeaders: cabecalhosOpenRouter() });
    const r = await client.chat.completions.parse({
      model: modelo,
      messages: [
        { role: "system", content: SISTEMA_COMANDO },
        {
          role: "user",
          content: [
            { type: "text", text: "Ouça o pedido e devolva o comando. Em 'eco', repita o que a pessoa pediu, curto." },
            // A tipagem do SDK da OpenAI ainda não cobre input_audio no helper .parse; o wire format é o da API.
            { type: "input_audio", input_audio: { data: audioBase64, format: formato } } as never,
          ],
        },
      ],
      response_format: zodResponseFormat(ComandoSchema, "comando"),
      max_tokens: 400,
      temperature: 0,
      ...(fallbacks.length ? ({ models: fallbacks } as object) : {}),
    });
    const cmd = r.choices[0]?.message.parsed;
    return cmd ? Response.json({ ...cmd, modelo }, { headers: CORS }) : falhou("modelo não devolveu comando");
  } catch (e) {
    console.error("[voz]", (e as Error).message);
    return falhou((e as Error).message);
  }
}
