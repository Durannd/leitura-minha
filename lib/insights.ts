/**
 * Camada de insight comercial. O adaptador muda a FORMA; esta camada acrescenta CONSEQUÊNCIA.
 * Regra dura: todo insight precisa de uma âncora — um trecho literal do artigo — senão não é exibido.
 * Sem âncora o insight vira opinião solta de chatbot; com âncora ele fica preso à frase que o gerou.
 */
import { z } from "zod";
import type { ContextoEmpresa } from "./empresa/contexto";

export const Insight = z.object({
  tipo: z.enum(["concorrente", "campanha", "oportunidade", "contradicao", "risco"]),
  /** Trecho LITERAL do artigo, 4 a 12 palavras, copiado sem alteração. É o que grifamos na página. */
  ancora: z.string(),
  titulo: z.string(),
  texto: z.string(),
  /** O próximo passo concreto. Sem verbo no imperativo, o insight não vale nada. */
  acao: z.string(),
  /** Nome da campanha ou do concorrente a que se refere, quando houver. */
  refere: z.string().nullable(),
});

export const Insights = z.object({ insights: z.array(Insight) });
export type TipoInsight = z.infer<typeof Insight>;

export const SISTEMA_INSIGHTS = [
  "Você é analista da empresa descrita abaixo. Leu um artigo de mercado e precisa dizer o que ele muda para ESTA empresa.",
  "Regras invioláveis:",
  "1. Todo insight começa por uma ÂNCORA: um trecho literal do artigo, de 4 a 12 palavras, copiado exatamente como está escrito. Se você não consegue copiar um trecho literal, não escreva o insight.",
  "2. Nenhum insight genérico. 'Invista em conteúdo' é lixo. 'O artigo diz que vídeo curto converte 3x; sua campanha Ruptura Zero só roda texto no LinkedIn e está 55% acima da meta de CPL' é insight.",
  "3. Cite sempre o nome da campanha, do concorrente ou do produto envolvido.",
  "4. Respeite as restrições da empresa: nunca sugira algo que ela já decidiu não fazer.",
  "5. Produza de 3 a 5 insights. Antes de fechar, percorra explicitamente a lista de concorrentes e a lista de campanhas: se um movimento de concorrente listado aparece no artigo (mesmo sem o nome dele), esse é o insight mais valioso e não pode faltar. Se uma campanha tem PROBLEMA ATUAL e o artigo toca nesse problema, idem.",
  "5b. Se o artigo sugere algo que está nas restrições, escreva um insight do tipo contradicao explicando por que não serve para esta empresa. Isso vale mais que silêncio.",
  "6. Ação em imperativo, executável esta semana, específica o bastante para alguém fazer sem perguntar nada.",
  "7. Português do Brasil, direto, sem jargão de consultoria.",
  "Tipos: concorrente (movimento de um concorrente citado ou implicado), campanha (afeta campanha em andamento), oportunidade (algo novo a fazer), contradicao (o artigo contraria o posicionamento ou a mensagem atual), risco (ameaça ao que está rodando).",
].join("\n");

export function contextoComoTexto(c: ContextoEmpresa): string {
  return [
    `EMPRESA: ${c.empresa}`,
    `O QUE VENDE: ${c.oQueVende}`,
    `ICP: ${c.icp}`,
    `POSICIONAMENTO: ${c.posicionamento}`,
    `TOM DE VOZ: ${c.tomDeVoz}`,
    "",
    "CAMPANHAS:",
    ...c.campanhas.map((k) => `- [${k.status}] ${k.nome} | canal: ${k.canal} | público: ${k.publico} | mensagem: "${k.mensagem}" | métrica: ${k.metrica}${k.problema ? ` | PROBLEMA ATUAL: ${k.problema}` : ""}`),
    "",
    "CONCORRENTES:",
    ...c.concorrentes.map((k) => `- ${k.nome}: ${k.posicionamento}\n  movimentos: ${k.movimentos.join("; ")}`),
    "",
    "RESTRIÇÕES (nunca sugira isto):",
    ...c.restricoes.map((r) => `- ${r}`),
  ].join("\n");
}

/** Normaliza para casar âncora com o texto renderizado, tolerando acento, caixa e espaço. */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Só sobrevive o insight cuja âncora existe de fato no artigo. Isto é a defesa contra alucinação:
 * o modelo não consegue inventar uma citação e passar por aqui.
 */
export function validarAncoras(insights: TipoInsight[], textoOriginal: string): { validos: TipoInsight[]; descartados: number } {
  const alvo = normalizar(textoOriginal);
  const validos = insights.filter((i) => {
    const a = normalizar(i.ancora);
    return a.length >= 12 && alvo.includes(a);
  });
  return { validos, descartados: insights.length - validos.length };
}
