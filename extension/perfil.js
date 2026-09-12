/** Espelho do lib/perfil/tipos.ts no cliente. O perfil vive AQUI — no navegador da pessoa, nunca no servidor. */
export const LIMIAR_AUTO = 0.7;

export const CATALOGO = {
  "frase-curta": "Frases curtas",
  "passos-numerados": "Passos numerados",
  "sem-metafora": "Sem metáfora",
  "glossario-jargao": "Jargão explicado",
  "resumo-antes": "Resumo antes",
  "bloco-curto": "Blocos curtos",
  "paleta-calma": "Paleta calma",
  "checklist-acao": "Checklist do que fazer",
  "sem-parede-texto": "Sem parede de texto",
  "ancoras-navegacao": "Âncoras de navegação",
};

export function perfilNovo() {
  const agora = new Date().toISOString();
  return {
    versao: 1, criadoEm: agora, atualizadoEm: agora,
    regras: [],
    limites: { palavrasPorFrase: 24, frasesPorBloco: 5, nivelLeitura: "original" },
    paleta: "original",
    historico: [],
  };
}

export async function lerPerfil() {
  const { perfil } = await chrome.storage.local.get("perfil");
  return perfil ?? perfilNovo();
}

export async function gravarPerfil(p) {
  await chrome.storage.local.set({ perfil: p });
  return p;
}

const PASSO_APROVACAO = 0.25;
const PASSO_REJEICAO = 0.4;
const clamp = (n) => Math.max(0, Math.min(1, n));

/** Mesma matemática do servidor. Determinístico: o jurado pode conferir na tela. */
export function aprovar(perfil, id, motivo) {
  const agora = new Date().toISOString();
  const ex = perfil.regras.find((r) => r.id === id);
  const regras = ex
    ? perfil.regras.map((r) => (r.id === id ? { ...r, ativa: true, aprovacoes: r.aprovacoes + 1, confianca: clamp(r.confianca + PASSO_APROVACAO) } : r))
    : [...perfil.regras, { id, rotulo: CATALOGO[id], motivo: motivo ?? "", ativa: true, confianca: PASSO_APROVACAO, aprovacoes: 1, rejeicoes: 0, desde: agora, origem: "aprendida" }];
  const detalhe = ex ? `"${CATALOGO[id]}" reforçada (${ex.aprovacoes + 1}ª aprovação)` : `"${CATALOGO[id]}" aprendida nesta página`;
  return { ...perfil, versao: perfil.versao + 1, atualizadoEm: agora, regras, historico: [...perfil.historico, { em: agora, tipo: "aprovou", regra: id, detalhe }] };
}

export function rejeitar(perfil, id) {
  const agora = new Date().toISOString();
  const regras = perfil.regras.map((r) => {
    if (r.id !== id) return r;
    const c = clamp(r.confianca - PASSO_REJEICAO);
    return { ...r, rejeicoes: r.rejeicoes + 1, confianca: c, ativa: c > 0 };
  });
  return { ...perfil, versao: perfil.versao + 1, atualizadoEm: agora, regras, historico: [...perfil.historico, { em: agora, tipo: "rejeitou", regra: id, detalhe: `"${CATALOGO[id]}" recuada` }] };
}

export function alternar(perfil, id, ativa) {
  const agora = new Date().toISOString();
  return {
    ...perfil, versao: perfil.versao + 1, atualizadoEm: agora,
    regras: perfil.regras.map((r) => (r.id === id ? { ...r, ativa } : r)),
    historico: [...perfil.historico, { em: agora, tipo: ativa ? "ativou" : "desativou", regra: id, detalhe: `"${CATALOGO[id]}" ${ativa ? "ligada" : "desligada"} por você` }],
  };
}

export const regrasAutomaticas = (p) => p.regras.filter((r) => r.ativa && r.confianca >= LIMIAR_AUTO);


/**
 * Voz entra com confiança 0.5 — abaixo do limiar automático (0.7) de propósito:
 * erro de transcrição não pode virar regra permanente na primeira vez.
 * Na segunda vez que a pessoa fala a mesma coisa, sobe para 0.75 e vira automático.
 */
export const PASSO_VOZ = 0.5;
const PASSO_VOZ_REFORCO = 0.25;

export function aprovarPorVoz(perfil, ids, frase) {
  const agora = new Date().toISOString();
  const limpos = (ids ?? []).filter((id) => CATALOGO[id]);
  if (!limpos.length) return perfil;
  let regras = perfil.regras.slice();
  const motivo = `você pediu falando: "${frase}"`;
  for (const id of limpos) {
    const ex = regras.find((r) => r.id === id);
    if (ex) {
      regras = regras.map((r) =>
        r.id === id
          ? { ...r, ativa: true, motivo: r.motivo || motivo, aprovacoes: r.aprovacoes + 1, confianca: clamp(Math.max(r.confianca, PASSO_VOZ) + PASSO_VOZ_REFORCO) }
          : r
      );
    } else {
      regras = [...regras, { id, rotulo: CATALOGO[id], motivo, ativa: true, confianca: PASSO_VOZ, aprovacoes: 1, rejeicoes: 0, desde: agora, origem: "voz" }];
    }
  }
  const rotulos = limpos.map((id) => CATALOGO[id]).join(", ");
  const virouAuto = regras.filter((r) => limpos.includes(r.id) && r.confianca >= LIMIAR_AUTO).map((r) => r.rotulo);
  const detalhe = `${motivo} → ${rotulos}${virouAuto.length ? ` · agora automático: ${virouAuto.join(", ")}` : ""}`;
  return {
    ...perfil,
    versao: perfil.versao + 1,
    atualizadoEm: agora,
    regras,
    historico: [...perfil.historico, { em: agora, tipo: "falou", regra: limpos[0], detalhe }],
  };
}
