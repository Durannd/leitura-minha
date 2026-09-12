/**
 * Motor determinístico. Duas funções de valor:
 *  - diagnosticar(): olha a página e diz o que nela machuca — é isso que deixa o agente INTERROMPER sozinho.
 *  - adaptarDeterministico(): adapta sem LLM nenhum. É o fallback que garante a demo e a prova de que
 *    o produto não é "um prompt": mesma entrada + mesmo perfil = exatamente a mesma saída.
 */
import type { IdRegra, Regra } from "@/lib/perfil/tipos";

export type Metricas = {
  palavras: number;
  frases: number;
  palavrasPorFrase: number;
  maiorBloco: number;
  /** Índice de leiturabilidade adaptado ao português (Flesch-Kincaid pt). Maior = mais fácil. */
  facilidade: number;
};

const FIM_DE_FRASE = /(?<=[.!?])\s+(?=[A-ZÀ-Ú"“(])/;

export function frasesDe(texto: string): string[] {
  return texto.split(FIM_DE_FRASE).map((f) => f.trim()).filter(Boolean);
}

export function paragrafosDe(texto: string): string[] {
  return texto.split(/\n{2,}|\n(?=\s*[A-ZÀ-Ú])/).map((p) => p.trim()).filter((p) => p.length > 0);
}

function silabas(palavra: string): number {
  const grupos = palavra.toLowerCase().match(/[aeiouáàâãéêíóôõúü]+/g);
  return Math.max(1, grupos ? grupos.length : 1);
}

export function metricasDoTexto(texto: string): Metricas {
  const frases = frasesDe(texto);
  const palavras = texto.split(/\s+/).filter(Boolean);
  const totalSilabas = palavras.reduce((s, p) => s + silabas(p), 0);
  const ppf = frases.length ? palavras.length / frases.length : palavras.length;
  const spp = palavras.length ? totalSilabas / palavras.length : 0;
  const maiorBloco = Math.max(0, ...paragrafosDe(texto).map((p) => p.split(/\s+/).filter(Boolean).length));
  return {
    palavras: palavras.length,
    frases: frases.length,
    palavrasPorFrase: Number(ppf.toFixed(1)),
    maiorBloco,
    facilidade: Number((248.835 - 1.015 * ppf - 84.6 * spp).toFixed(1)),
  };
}

export type Diagnostico = { id: IdRegra; evidencia: string; severidade: 1 | 2 | 3 };

/** Detecta jargão: sigla em caixa alta, ou palavra longa e rara. Simples de propósito — precisa ser explicável. */
const RE_SIGLA = /\b[A-ZÀ-Ú]{3,6}\b/g;

/**
 * O agente olha a página ANTES de qualquer pergunta e diz, com evidência numérica, o que ali vai doer.
 * Cada diagnóstico vira uma proposta de adaptação com motivo visível ao usuário.
 */
export function diagnosticar(texto: string): Diagnostico[] {
  const m = metricasDoTexto(texto);
  const out: Diagnostico[] = [];
  if (m.palavrasPorFrase > 22) {
    out.push({ id: "frase-curta", evidencia: `frases com ${m.palavrasPorFrase} palavras em média`, severidade: m.palavrasPorFrase > 30 ? 3 : 2 });
  }
  if (m.maiorBloco > 120) {
    out.push({ id: "sem-parede-texto", evidencia: `um bloco único de ${m.maiorBloco} palavras`, severidade: 3 });
  } else if (m.maiorBloco > 70) {
    out.push({ id: "bloco-curto", evidencia: `blocos de até ${m.maiorBloco} palavras`, severidade: 2 });
  }
  const siglas = Array.from(new Set(texto.match(RE_SIGLA) ?? []));
  if (siglas.length >= 3) {
    out.push({ id: "glossario-jargao", evidencia: `${siglas.length} siglas sem explicação (${siglas.slice(0, 3).join(", ")})`, severidade: 2 });
  }
  if (m.palavras > 600) {
    out.push({ id: "resumo-antes", evidencia: `${m.palavras} palavras sem resumo no topo`, severidade: 2 });
  }
  if (/\b(primeiro|em seguida|depois|por fim|etapa|passo)\b/i.test(texto)) {
    out.push({ id: "passos-numerados", evidencia: "o texto descreve uma sequência em prosa corrida", severidade: 1 });
  }
  if (m.facilidade < 40) {
    out.push({ id: "sem-metafora", evidencia: `índice de facilidade ${m.facilidade} (abaixo de 40 é difícil)`, severidade: 2 });
  }
  return out.sort((a, b) => b.severidade - a.severidade);
}

type Bloco = { tipo: "resumo" | "paragrafo" | "passo" | "checklist" | "subtitulo"; titulo: string | null; texto: string; ordem: number | null };

const CONECTIVO = /,\s+(?=(?:mas|porém|entretanto|contudo|enquanto|embora|cuja|cujo|sendo|observado|ressalvad|no qual|na qual|pois|porque|e\s|que\s))/i;

/** Quebra recursiva: uma frase de 50 palavras vira 4 de 12, não 2 de 25. */
function quebrarFrase(frase: string, maxPalavras: number, profundidade = 0): string[] {
  const palavras = frase.trim().split(/\s+/).filter(Boolean);
  if (palavras.length <= maxPalavras || profundidade > 5) return [frase.trim()];
  const corte = frase.search(CONECTIVO);
  let a: string, b: string;
  if (corte > 15 && corte < frase.length - 15) {
    a = frase.slice(0, corte).trim();
    b = frase.slice(corte + 1).trim();
  } else {
    // sem conectivo utilizável: corta na vírgula mais próxima do meio
    const virgulas = [...frase.matchAll(/,/g)].map((m) => m.index!);
    const meioChar = frase.length / 2;
    const vMeio = virgulas.sort((x, y) => Math.abs(x - meioChar) - Math.abs(y - meioChar))[0];
    if (vMeio !== undefined && vMeio > 15 && vMeio < frase.length - 15) {
      a = frase.slice(0, vMeio).trim();
      b = frase.slice(vMeio + 1).trim();
    } else {
      const meio = Math.ceil(palavras.length / 2);
      a = palavras.slice(0, meio).join(" ");
      b = palavras.slice(meio).join(" ");
    }
  }
  const pontuar = (s: string) => (/[.!?]$/.test(s) ? s : s + ".");
  const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [
    ...quebrarFrase(pontuar(a), maxPalavras, profundidade + 1),
    ...quebrarFrase(maiuscula(b), maxPalavras, profundidade + 1),
  ];
}

/** Adaptação sem LLM. Não é tão boa quanto a do modelo — mas é instantânea, grátis e nunca alucina. */
export function adaptarDeterministico(
  texto: string,
  titulo: string,
  regras: Regra[],
  limites: { palavrasPorFrase: number; frasesPorBloco: number },
): { blocos: Bloco[]; glossario: { termo: string; definicao: string }[]; explicacao: string } {
  const ativa = (id: IdRegra) => regras.some((r) => r.id === id);
  const blocos: Bloco[] = [];
  const paras = paragrafosDe(texto);

  if (ativa("resumo-antes")) {
    const primeiras = frasesDe(texto).slice(0, 3).join(" ");
    blocos.push({ tipo: "resumo", titulo: "Do que se trata", texto: primeiras, ordem: null });
  }

  const querPassos = ativa("passos-numerados") && /\b(primeiro|em seguida|depois|por fim|etapa|passo)\b/i.test(texto);
  let ordem = 1;

  for (const p of paras) {
    let frases = frasesDe(p);
    if (ativa("frase-curta")) frases = frases.flatMap((f) => quebrarFrase(f, limites.palavrasPorFrase));
    const tamanhoBloco = ativa("bloco-curto") || ativa("sem-parede-texto") ? limites.frasesPorBloco : frases.length;
    for (let i = 0; i < frases.length; i += tamanhoBloco) {
      const pedaco = frases.slice(i, i + tamanhoBloco).join(" ");
      if (querPassos) {
        blocos.push({ tipo: "passo", titulo: null, texto: pedaco, ordem: ordem++ });
      } else {
        blocos.push({ tipo: "paragrafo", titulo: null, texto: pedaco, ordem: null });
      }
    }
  }

  const glossario = ativa("glossario-jargao")
    ? Array.from(new Set(texto.match(RE_SIGLA) ?? []))
        .slice(0, 8)
        .map((termo) => ({ termo, definicao: "Termo técnico encontrado no texto — ligue o modelo para a definição." }))
    : [];

  const nomes = regras.map((r) => r.rotulo.toLowerCase());
  const explicacao = nomes.length
    ? `Apliquei ${nomes.join(", ")} porque você aprovou isso antes. Adaptação local, sem modelo.`
    : "Só quebrei os blocos maiores. Ainda não aprendi nenhuma preferência sua.";

  return { blocos: blocos.length ? blocos : [{ tipo: "paragrafo", titulo: titulo || null, texto, ordem: null }], glossario, explicacao };
}
