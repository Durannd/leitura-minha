/**
 * O perfil de leitura é o produto. Não é um prompt: é um objeto versionado, determinístico e exportável
 * que pertence à pessoa, não ao site. O LLM preenche conteúdo; o perfil decide a forma.
 */

export type IdRegra =
  | "frase-curta"
  | "passos-numerados"
  | "sem-metafora"
  | "glossario-jargao"
  | "resumo-antes"
  | "bloco-curto"
  | "paleta-calma"
  | "checklist-acao"
  | "sem-parede-texto"
  | "ancoras-navegacao";

export type Regra = {
  id: IdRegra;
  rotulo: string;
  /** O que a pessoa disse, em linguagem dela. Nunca um diagnóstico. */
  motivo: string;
  ativa: boolean;
  /** 0..1. Sobe a cada aprovação, cai a cada rejeição. >= LIMIAR_AUTO aplica sem perguntar. */
  confianca: number;
  /** Quantas vezes a pessoa aprovou esta adaptação. */
  aprovacoes: number;
  rejeicoes: number;
  /** ISO. Quando entrou no perfil. */
  desde: string;
  /** Como a regra entrou: pedido explícito, aprendida por aprovação, ou padrão de fábrica. */
  origem: "pedido" | "aprendida" | "padrao";
};

export type Perfil = {
  versao: number;
  /** Sempre local. Nunca sai do dispositivo sem ação explícita de exportar. */
  criadoEm: string;
  atualizadoEm: string;
  regras: Regra[];
  /** Preferências numéricas que o motor de regras lê direto. */
  limites: {
    palavrasPorFrase: number;
    frasesPorBloco: number;
    nivelLeitura: "simples" | "medio" | "original";
  };
  paleta: "original" | "sepia" | "alto-contraste" | "escuro-suave";
  /** Log append-only. É o que prova ao jurado que o agente aprendeu, e não que alguém digitou. */
  historico: EventoPerfil[];
};

export type EventoPerfil = {
  em: string;
  tipo: "aprovou" | "rejeitou" | "ativou" | "desativou" | "ajustou" | "aplicou";
  regra?: IdRegra;
  detalhe: string;
};

export const LIMIAR_AUTO = 0.7;

export const CATALOGO: Record<IdRegra, { rotulo: string; motivoPadrao: string }> = {
  "frase-curta": { rotulo: "Frases curtas", motivoPadrao: "frases longas me fazem perder o fio" },
  "passos-numerados": { rotulo: "Passos numerados", motivoPadrao: "prefiro ver a ordem das coisas" },
  "sem-metafora": { rotulo: "Sem metáfora", motivoPadrao: "figura de linguagem me confunde" },
  "glossario-jargao": { rotulo: "Jargão explicado", motivoPadrao: "travo em termo técnico" },
  "resumo-antes": { rotulo: "Resumo antes", motivoPadrao: "preciso saber onde estou entrando" },
  "bloco-curto": { rotulo: "Blocos curtos", motivoPadrao: "bloco grande eu pulo" },
  "paleta-calma": { rotulo: "Paleta calma", motivoPadrao: "fundo branco puro cansa meus olhos" },
  "checklist-acao": { rotulo: "Checklist do que fazer", motivoPadrao: "quero saber o que me pedem" },
  "sem-parede-texto": { rotulo: "Sem parede de texto", motivoPadrao: "parede de texto me trava antes de começar" },
  "ancoras-navegacao": { rotulo: "Âncoras de navegação", motivoPadrao: "me perco e não sei voltar" },
};

/** Perfil de fábrica: neutro. Nada é presumido sobre a pessoa. */
export function perfilNovo(agora = new Date().toISOString()): Perfil {
  return {
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora,
    regras: [],
    limites: { palavrasPorFrase: 24, frasesPorBloco: 5, nivelLeitura: "original" },
    paleta: "original",
    historico: [],
  };
}
