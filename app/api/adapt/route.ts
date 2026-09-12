/**
 * /api/adapt — o motor. A extensão manda o texto do artigo + o perfil; devolvemos ESTRUTURA, não HTML.
 * Quem decide a forma é o motor de regras (determinístico). O LLM só preenche o conteúdo dentro da forma.
 * Se o LLM falhar ou não houver chave, o fallback determinístico ainda adapta — a demo nunca cai.
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { OPENROUTER_BASE_URL, cabecalhosOpenRouter, modeloOpenRouter, provedorDisponivel } from "@/lib/llm";
import { SISTEMA_ADAPTADOR, instrucaoDasRegras } from "@/lib/prompts";
import { adaptarDeterministico, diagnosticar, metricasDoTexto } from "@/lib/rules/adaptar";
import { regrasATestar, regrasAutomaticas } from "@/lib/perfil/aprendizado";
import { CATALOGO, perfilNovo, type Perfil, type Regra } from "@/lib/perfil/tipos";
import { CONTEXTO_DEMO, type ContextoEmpresa } from "@/lib/empresa/contexto";
import { Insights, SISTEMA_INSIGHTS, contextoComoTexto, validarAncoras, type TipoInsight } from "@/lib/insights";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIMITE_TEXTO = 24_000;

const Bloco = z.object({
  tipo: z.enum(["resumo", "paragrafo", "passo", "checklist", "subtitulo"]),
  titulo: z.string().nullable(),
  texto: z.string(),
  /** Só para tipo passo: posição na sequência. */
  ordem: z.number().nullable(),
});

const Adaptacao = z.object({
  blocos: z.array(Bloco),
  glossario: z.array(z.object({ termo: z.string(), definicao: z.string() })),
  /** Uma frase, em 1ª pessoa, dizendo o que o agente mudou e por quê. Transparência do raciocínio. */
  explicacao: z.string(),
});

export type AdaptacaoLLM = z.infer<typeof Adaptacao>;

/** A extensão fala de outra origem: sem estes headers o fetch morre em preflight. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function responder(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { texto?: unknown; titulo?: unknown; url?: unknown; perfil?: unknown; contexto?: unknown } | null;
  const texto = typeof body?.texto === "string" ? body.texto.slice(0, LIMITE_TEXTO) : "";
  const titulo = typeof body?.titulo === "string" ? body.titulo : "";
  if (texto.trim().length < 200) {
    return responder({ erro: "Esta página não parece ter um artigo para adaptar." }, 422);
  }
  const perfil = (body?.perfil ?? perfilNovo()) as Perfil;
  const contexto = (body?.contexto ?? CONTEXTO_DEMO) as ContextoEmpresa;
  const automaticas = regrasAutomaticas(perfil);
  const aTestar = regrasATestar(perfil);

  /**
   * O agente olha a página ANTES de qualquer pergunta e propõe o que ali vai doer, com evidência numérica.
   * É isto que fecha o ciclo de aprendizado: sem proposta não há aprovação, sem aprovação não há perfil.
   * Só propõe o que a pessoa ainda não julgou — nada de reofertar o que ela já recusou.
   */
  const jaJulgadas = new Set(perfil.regras.map((r) => r.id));
  const propostas: Regra[] = diagnosticar(texto)
    .filter((d) => !jaJulgadas.has(d.id))
    .slice(0, 3)
    .map((d) => ({
      id: d.id,
      rotulo: CATALOGO[d.id].rotulo,
      motivo: d.evidencia,
      ativa: true,
      confianca: 0,
      aprovacoes: 0,
      rejeicoes: 0,
      desde: new Date().toISOString(),
      origem: "padrao" as const,
    }));

  // Propostas são aplicadas de imediato: a pessoa vê o resultado antes de decidir se fixa.
  const aplicaveis = [...automaticas, ...aTestar, ...propostas];
  const antes = metricasDoTexto(texto);

  let adaptacao: AdaptacaoLLM | null = null;
  let insights: TipoInsight[] = [];
  let descartados = 0;
  let motor: "llm" | "deterministico" = "deterministico";

  if (provedorDisponivel() === "openrouter") {
    const { id, fallbacks } = modeloOpenRouter();
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: cabecalhosOpenRouter(),
    });
    const teto = Number(process.env.LLM_MAX_OUTPUT_TOKENS ?? 2048);
    const extra = fallbacks.length ? ({ models: fallbacks } as object) : {};

    // As duas chamadas são independentes: em paralelo o tempo de parede é o da mais lenta, não a soma.
    const [rAdapt, rInsight] = await Promise.allSettled([
      client.chat.completions.parse({
        model: id,
        messages: [
          { role: "system", content: SISTEMA_ADAPTADOR },
          { role: "system", content: instrucaoDasRegras(aplicaveis, perfil.limites) },
          { role: "user", content: `Título: ${titulo}\n\nTexto original:\n${texto}` },
        ],
        response_format: zodResponseFormat(Adaptacao, "adaptacao"),
        max_tokens: teto,
        ...extra,
      }),
      client.chat.completions.parse({
        model: id,
        messages: [
          { role: "system", content: SISTEMA_INSIGHTS },
          { role: "system", content: contextoComoTexto(contexto) },
          { role: "user", content: `Artigo lido — título: ${titulo}\nFonte: ${body?.url ?? "—"}\n\n${texto}` },
        ],
        response_format: zodResponseFormat(Insights, "insights"),
        max_tokens: teto,
        ...extra,
      }),
    ]);

    if (rAdapt.status === "fulfilled") {
      adaptacao = rAdapt.value.choices[0]?.message.parsed ?? null;
      if (adaptacao) motor = "llm";
    } else {
      console.error("[adapt] adaptação falhou:", rAdapt.reason?.message);
    }

    if (rInsight.status === "fulfilled") {
      const crus = rInsight.value.choices[0]?.message.parsed?.insights ?? [];
      // Insight sem âncora literal no artigo é descartado: é a defesa contra alucinação.
      const v = validarAncoras(crus, texto);
      insights = v.validos.slice(0, 6);
      descartados = v.descartados;
    } else {
      console.error("[adapt] insights falharam:", rInsight.reason?.message);
    }
  }

  if (!adaptacao) adaptacao = adaptarDeterministico(texto, titulo, aplicaveis, perfil.limites);

  const depois = metricasDoTexto(adaptacao.blocos.map((b) => b.texto).join("\n\n"));

  return responder({
    motor,
    blocos: adaptacao.blocos,
    glossario: adaptacao.glossario,
    explicacao: adaptacao.explicacao,
    paleta: perfil.paleta,
    insights,
    /** Quantos o modelo propôs sem âncora real no texto e foram jogados fora. Vai na tela: é prova de rigor. */
    insightsDescartados: descartados,
    empresa: { nome: contexto.empresa, versao: contexto.versao, campanhasAtivas: contexto.campanhas.filter((c) => c.status === "ativa").length, concorrentes: contexto.concorrentes.length },
    /** O que foi aplicado sozinho vs. o que ainda precisa de aprovação. A extensão usa isto para decidir o card. */
    aplicadasAutomaticamente: automaticas.map((r) => ({ id: r.id, rotulo: r.rotulo, confianca: r.confianca })),
    /** O card só aparece para o que ainda não virou automático. Cada item traz a evidência que o motivou. */
    pedindoAprovacao: [...aTestar, ...propostas].map((r) => ({ id: r.id, rotulo: r.rotulo, motivo: r.motivo, novo: r.origem === "padrao" })),
    /** O que o agente detectou na página, com número. Transparência do raciocínio. */
    diagnostico: diagnosticar(texto).map((d) => ({ id: d.id, rotulo: CATALOGO[d.id].rotulo, evidencia: d.evidencia, severidade: d.severidade })),
    metricas: { antes, depois },
  });
}
