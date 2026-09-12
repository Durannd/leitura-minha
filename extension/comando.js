/** Léxico de comandos, versão módulo ES — usado pelo service worker. O content script tem uma cópia inline (não pode importar). */
/**
 * Léxico determinístico de comandos de leitura em pt-BR.
 * Sem rede, sem modelo: o que a pessoa fala vira intenção aqui mesmo, em milissegundos.
 * A LLM só entra quando isto devolve confiança baixa.
 */
const IDS_ESTRUTURA = ["frase-curta", "passos-numerados", "sem-metafora", "glossario-jargao", "resumo-antes", "bloco-curto", "checklist-acao", "sem-parede-texto", "ancoras-navegacao", "paleta-calma"];

const ROTULOS = {
  "frase-curta": "frases curtas",
  "passos-numerados": "passos numerados",
  "sem-metafora": "sem metáfora",
  "glossario-jargao": "jargão explicado",
  "resumo-antes": "resumo antes",
  "bloco-curto": "blocos curtos",
  "paleta-calma": "paleta calma",
  "checklist-acao": "checklist do que fazer",
  "sem-parede-texto": "sem parede de texto",
  "ancoras-navegacao": "âncoras de navegação",
};

/** cada entrada: [id, regex]. Tolerante a acento, conjugação e ordem das palavras. */
const REGRAS = [
  ["passos-numerados", /passos?\s*(numerad\w*)?|passo\s*a\s*passo|lista\s*numerada|numera\w*\s*(os\s*)?passos|em\s*etapas/i],
  ["frase-curta", /frases?\s*(bem\s*|mais\s*|super\s*|curtinh\w*)*curt\w*|encurt\w*\s*(as\s*)?frases|frase\s*curtinha/i],
  ["glossario-jargao", /jarg[aã]o|gloss[aá]rio|termos?\s*t[eé]cnic\w*|explic\w*\s*(os\s*)?termos|destac\w*\s*(os\s*)?termos|palavr\w*\s*dif[ií]ce\w*/i],
  ["resumo-antes", /resum\w*|tl;?dr|do\s*que\s*se\s*trata|come[çc]\w*\s*com\s*(um\s*)?resumo/i],
  ["checklist-acao", /checklist|lista\s*de\s*a[çc][õo]es|o\s*que\s*(eu\s*)?fa[çz]\w*|o\s*que\s*fazer|plano\s*de\s*a[çc][aã]o/i],
  ["bloco-curto", /blocos?\s*curt\w*|par[aá]grafos?\s*curt\w*|peda[çc]os?\s*menor\w*/i],
  ["sem-metafora", /met[aá]for\w*|figura\s*de\s*linguagem|ao\s*p[eé]\s*da\s*letra|linguagem\s*(bem\s*)?direta|sem\s*rodeio/i],
  ["ancoras-navegacao", /[âa]ncora\w*|navega[çc][aã]o|[íi]ndice|sum[aá]rio|atalho\w*\s*(pro|para)\s*(o\s*)?texto/i],
  ["sem-parede-texto", /parede\s*de\s*texto|texto\s*corrido|quebr\w*\s*o\s*texto|bloc[aã]o/i],
  ["paleta-calma", /paleta\s*calma|cores?\s*calma\w*|cores?\s*suave\w*/i],
];

const PALETAS_FALA = [
  ["escuro-suave", /fundo\s*escuro|modo\s*escuro|escurec\w*|modo\s*noturno|tema\s*escuro|dark/i],
  ["sepia", /s[eé]pia|amarelad\w*|papel\s*velho|cor\s*de\s*papel/i],
  ["alto-contraste", /alto\s*contraste|contraste\s*(bem\s*)?alt\w*|preto\s*(e|no)\s*branco/i],
  ["claro", /fundo\s*(claro|branco)|modo\s*claro|clarea\w*|tema\s*claro/i],
];

/** Regras cujo nome já é negativo: "tira as metáforas" quer LIGAR "sem-metafora", não desligar. */
const POLARIDADE_NEGATIVA = ["sem-metafora", "sem-parede-texto"];

const RE_NEGACAO = /\b(tira|tirar|tire|remove|remover|sem|desliga|desligar|desligue|para\s*de|pare\s*de|n[aã]o\s*quero|chega\s*de|esquece)\b/i;
const RE_FONTE_MAIS = /(aument\w*|maior|cresc\w*|amplia\w*)[^.;]{0,24}?(fonte|letra|texto|tamanho)|(fonte|letra|texto|tamanho)[^.;]{0,24}?(maior|aument\w*)/i;
const RE_FONTE_MENOS = /(diminu\w*|reduz\w*|menor|encolh\w*)[^.;]{0,24}?(fonte|letra|texto|tamanho)|(fonte|letra|texto|tamanho)[^.;]{0,24}?(menor|diminu\w*)/i;
const RE_SEM_COR = /(tir\w*|sem|remov\w*|desli\w*|chega\s*de)[^.;]{0,20}?(cores?|grifos?|destaques?|marca[çc][aã]o|colorid\w*)/i;
const RE_COM_COR = /(volt\w*|p[oõ]e|poe|coloc\w*|liga\w*|quero|traz|devolv\w*)[^.;]{0,20}?(cores?|grifos?|destaques?)/i;
const CORES = [["amarelo", /amarel\w*/i], ["azul", /azul|azuis/i], ["verde", /verde/i], ["vermelho", /vermelh\w*/i], ["rosa", /rosa|magenta/i], ["roxo", /roxo|lil[aá]s|violeta/i]];

const RE_ORIGINAL = /volt\w*[^.;]{0,18}?(original|normal|como\s*(era|tava|estava))|ver\s*(o\s*)?original|p[aá]gina\s*original|desfaz\w*|desfa[çc]\w*|reverte\w*|cancel\w*\s*tudo/i;
const RE_REFAZER = /refaz\w*|refa[çc]\w*|readapt\w*|adapt\w*|de\s*novo|tenta\s*de\s*novo|atualiz\w*\s*(a\s*)?tela|aplica\w*/i;
const RE_EXPORTAR = /exporta\w*|baix\w*\s*(o\s*)?(json|perfil)|salva\w*\s*(o\s*)?perfil/i;

const RE_PALAVRAS = /(\d{1,2})\s*palavras/i;
const RE_FRASES = /(\d{1,2})\s*frases/i;

/** Palpites oferecidos quando não entendemos: são cliques, não digitação. */
const PALPITES = [
  "deixa as frases bem curtas",
  "adapta em passos numerados",
  "fundo escuro",
  "aumenta a fonte",
  "explica os termos técnicos",
  "tira as cores",
  "volta pro original",
];

const semAcentoTxt = (t) => (t || "").normalize("NFD").replace(new RegExp("[\u0300-\u036f]", "g"), "");

/** Quebra em orações para que "passos numerados, mas tira as metáforas" negue só a segunda parte. */
function segmentos(frase) {
  return frase
    .split(/,| e | mas | por[eé]m |;|\.| tamb[eé]m /i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function interpretarLocal(fraseBruta) {
  const frase = (fraseBruta || "").trim();
  const cmd = { ligar: [], desligar: [], limites: {}, fonte: null, paleta: null, destaques: null, acoes: [], confianca: 0, eco: "", naoEntendido: "", frase };
  if (!frase) return cmd;
  const partes = [];

  for (const seg of segmentos(frase)) {
    const neg = RE_NEGACAO.test(seg);
    for (const [id, re] of REGRAS) {
      if (!re.test(seg)) continue;
      const destino = neg && !POLARIDADE_NEGATIVA.includes(id) ? cmd.desligar : cmd.ligar;
      if (!destino.includes(id)) destino.push(id);
    }
  }
  // uma regra nunca fica nos dois lados: desligar manda
  cmd.ligar = cmd.ligar.filter((id) => !cmd.desligar.includes(id));

  for (const [nome, re] of PALETAS_FALA) {
    if (re.test(frase)) { cmd.paleta = nome; break; }
  }

  if (RE_FONTE_MENOS.test(frase)) cmd.fonte = { passo: -1 };
  else if (RE_FONTE_MAIS.test(frase)) cmd.fonte = { passo: +1 };

  if (RE_SEM_COR.test(frase)) cmd.destaques = { ligado: false };
  else if (RE_COM_COR.test(frase)) cmd.destaques = { ligado: true };
  for (const [cor, re] of CORES) {
    if (re.test(frase) && !/fundo/i.test(frase.slice(Math.max(0, frase.search(re)) - 12, frase.search(re)))) {
      cmd.destaques = { ligado: true, ...(cmd.destaques || {}), cor };
      cmd.destaques.ligado = cmd.destaques.ligado !== false;
      break;
    }
  }

  if (RE_ORIGINAL.test(frase)) cmd.acoes.push("reverter");
  if (RE_EXPORTAR.test(frase)) cmd.acoes.push("exportar");

  const mp = frase.match(RE_PALAVRAS);
  if (mp) cmd.limites.palavrasPorFrase = Math.max(4, Math.min(40, +mp[1]));
  const mf = frase.match(RE_FRASES);
  if (mf) cmd.limites.frasesPorBloco = Math.max(1, Math.min(12, +mf[1]));

  const mudaEstrutura = cmd.ligar.length || cmd.desligar.length || Object.keys(cmd.limites).length;
  if (!cmd.acoes.includes("reverter") && (mudaEstrutura || RE_REFAZER.test(frase))) {
    if (mudaEstrutura || /refaz|refa[çc]|readapt|de\s*novo|adapt/i.test(frase)) cmd.acoes.push("readaptar");
  }

  // ---- eco: o que eu entendi, em português curto ----
  partes.push(...cmd.ligar.map((id) => ROTULOS[id] ?? id));
  partes.push(...cmd.desligar.map((id) => {
    const r = ROTULOS[id] ?? id;
    return /^sem /.test(r) ? r.replace(/^sem /, "pode usar ") : `sem ${r}`;
  }));
  if (cmd.limites.palavrasPorFrase) partes.push(`${cmd.limites.palavrasPorFrase} palavras por frase`);
  if (cmd.limites.frasesPorBloco) partes.push(`${cmd.limites.frasesPorBloco} frases por bloco`);
  if (cmd.paleta) partes.push(cmd.paleta.replace("-", " "));
  if (cmd.fonte) partes.push(cmd.fonte.passo > 0 ? "fonte maior" : "fonte menor");
  if (cmd.destaques) partes.push(cmd.destaques.ligado === false ? "sem grifos" : `grifos${cmd.destaques.cor ? " " + cmd.destaques.cor : " ligados"}`);
  if (cmd.acoes.includes("reverter")) partes.push("voltar ao original");
  cmd.eco = partes.join(" · ");
  cmd.chips = partes;

  // ---- confiança ----
  const casouAlgo = partes.length > 0;
  if (!casouAlgo) {
    cmd.confianca = 0;
    cmd.naoEntendido = frase;
    return cmd;
  }
  // quanto do que foi dito sobrou sem mapear?
  const palavras = semAcentoTxt(frase.toLowerCase()).split(/\s+/).filter((p) => p.length > 3);
  const cobertas = semAcentoTxt(partes.join(" ").toLowerCase());
  const sobrou = palavras.filter((p) => !cobertas.includes(p.slice(0, 4)));
  cmd.confianca = sobrou.length >= 4 && sobrou.length > palavras.length * 0.7 ? 0.5 : 0.95;
  if (cmd.confianca < 0.9) cmd.naoEntendido = sobrou.join(" ");
  return cmd;
}

export { interpretarLocal, IDS_ESTRUTURA, ROTULOS, PALPITES };
