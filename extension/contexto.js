/**
 * O contexto é do usuário: fica no navegador dele, ele escreve, ele apaga.
 * Formato de linha ("Nome | campo | campo") em vez de formulário aninhado: dá para preencher em 2 minutos,
 * que é o tempo real que alguém dedica antes de desistir de configurar uma ferramenta.
 */
export const VAZIO = {
  versao: 1,
  atualizadoEm: null,
  empresa: "",
  meuCargo: "",
  oQueEuFaco: "",
  oQueVende: "",
  icp: "",
  posicionamento: "",
  tomDeVoz: "",
  campanhasTexto: "",
  concorrentesTexto: "",
  restricoesTexto: "",
};

export const EXEMPLO = {
  versao: 7,
  atualizadoEm: new Date().toISOString(),
  empresa: "Fluxo",
  meuCargo: "Product Marketing Manager",
  oQueEuFaco: "Cuido de posicionamento, lançamento e inteligência competitiva. Escrevo os battlecards e decido a mensagem das campanhas com o time de demanda.",
  oQueVende: "Software de gestão de estoque para redes de farmácia de médio porte (8 a 60 lojas), assinatura mensal por loja.",
  icp: "Diretor de operações ou sócio de rede regional de farmácias no Brasil, 8 a 60 lojas, que ainda controla estoque por planilha ou ERP genérico.",
  posicionamento: "O ERP genérico trata remédio como mercadoria. A Fluxo entende validade, lote, rastreabilidade ANVISA e ruptura de item controlado.",
  tomDeVoz: "Direto e técnico. Fala com quem opera, não com quem investe. Sem promessa de transformação digital.",
  campanhasTexto: [
    "ativa | Ruptura Zero | LinkedIn Ads + e-mail frio | Diretor de operações, 15+ lojas | CPL R$ 340, meta R$ 220 | CPL 55% acima da meta há 3 semanas e resposta do e-mail caiu de 4,1% para 1,8%",
    "ativa | Troca de ERP | Conteúdo orgânico + SEO | Quem já tem ERP genérico | 12 leads/mês, meta 30 | Ranqueia mas converte pouco: tempo na página alto, clique no CTA baixo",
    "planejada | Indicação de balconista | Programa de indicação | Balconistas das redes clientes | —",
  ].join("\n"),
  concorrentesTexto: [
    "Trinks ERP | ERP genérico de varejo que atende farmácia como um vertical entre outros | Lançou calculadora de ruptura gratuita como isca de lead; investe pesado em busca paga; publica case toda semana no LinkedIn",
    "Estoque Vivo | Concorrente direto, mesma vertical, preço 30% menor e produto mais raso | Webinars com conselhos regionais; ataca a Fluxo por preço em comparativo público; contratou dois vendedores que saíram da Fluxo",
  ].join("\n"),
  restricoesTexto: [
    "Não fazemos trial gratuito: a implantação exige integração e um trial ruim queima o lead.",
    "Não vendemos para farmácia independente de 1 a 3 lojas — o ticket não paga o suporte.",
    "Não usamos influenciador de negócios; o público desconfia.",
  ].join("\n"),
};

const linhas = (t) => (t ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const partes = (l) => l.split("|").map((p) => p.trim());

/** Converte o formato de linha no objeto que o servidor espera. Tolerante: campo faltando vira vazio. */
export function paraContextoServidor(c) {
  return {
    versao: c.versao ?? 1,
    atualizadoEm: c.atualizadoEm ?? new Date().toISOString(),
    empresa: c.empresa || "(empresa não informada)",
    quemLe: [c.meuCargo, c.oQueEuFaco].filter(Boolean).join(" — "),
    oQueVende: c.oQueVende || "",
    icp: c.icp || "",
    posicionamento: c.posicionamento || "",
    tomDeVoz: c.tomDeVoz || "",
    campanhas: linhas(c.campanhasTexto).map((l, i) => {
      const [status, nome, canal, publico, metrica, problema] = partes(l);
      return {
        id: `c${i + 1}`,
        status: ["ativa", "planejada", "encerrada"].includes(status) ? status : "ativa",
        nome: nome || status,
        canal: canal || "",
        publico: publico || "",
        mensagem: "",
        metrica: metrica || "",
        problema: problema || undefined,
      };
    }),
    concorrentes: linhas(c.concorrentesTexto).map((l) => {
      const [nome, posicionamento, movs] = partes(l);
      return { nome, posicionamento: posicionamento || "", movimentos: (movs ?? "").split(";").map((m) => m.trim()).filter(Boolean) };
    }),
    restricoes: linhas(c.restricoesTexto),
  };
}

export async function lerContexto() {
  const { contexto } = await chrome.storage.local.get("contexto");
  return contexto ?? VAZIO;
}

export async function gravarContexto(c) {
  const novo = { ...c, versao: (c.versao ?? 0) + 1, atualizadoEm: new Date().toISOString() };
  await chrome.storage.local.set({ contexto: novo });
  return novo;
}

/** Sem empresa nem campanha, não há insight possível: melhor avisar do que gerar genérico. */
export function contextoUtil(c) {
  return Boolean(c?.empresa && (linhas(c.campanhasTexto).length || linhas(c.concorrentesTexto).length));
}
