/**
 * Aprendizado por aprovação. Determinístico e auditável: mesma sequência de eventos = mesmo perfil.
 * Nenhum LLM participa desta decisão — é aqui que o produto para de ser "um prompt".
 */
import { CATALOGO, LIMIAR_AUTO, type EventoPerfil, type IdRegra, type Perfil, type Regra } from "./tipos";

const PASSO_APROVACAO = 0.25;
const PASSO_REJEICAO = 0.4;

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function registrar(p: Perfil, ev: EventoPerfil): Perfil {
  return { ...p, versao: p.versao + 1, atualizadoEm: ev.em, historico: [...p.historico, ev] };
}

/** A pessoa aprovou uma adaptação. Se a regra é nova, entra com confiança baixa; se já existe, sobe. */
export function aprovar(perfil: Perfil, id: IdRegra, motivo?: string, agora = new Date().toISOString()): Perfil {
  const existente = perfil.regras.find((r) => r.id === id);
  let regras: Regra[];
  if (existente) {
    regras = perfil.regras.map((r) =>
      r.id === id ? { ...r, ativa: true, aprovacoes: r.aprovacoes + 1, confianca: clamp(r.confianca + PASSO_APROVACAO) } : r,
    );
  } else {
    regras = [
      ...perfil.regras,
      {
        id,
        rotulo: CATALOGO[id].rotulo,
        motivo: motivo ?? CATALOGO[id].motivoPadrao,
        ativa: true,
        confianca: PASSO_APROVACAO,
        aprovacoes: 1,
        rejeicoes: 0,
        desde: agora,
        origem: "aprendida",
      },
    ];
  }
  const detalhe = existente
    ? `"${CATALOGO[id].rotulo}" reforçada (${existente.aprovacoes + 1}ª aprovação)`
    : `"${CATALOGO[id].rotulo}" aprendida a partir desta página`;
  return registrar({ ...perfil, regras }, { em: agora, tipo: "aprovou", regra: id, detalhe });
}

/** Rejeição custa mais que aprovação: é mais grave insistir numa adaptação indesejada do que deixar de aplicar. */
export function rejeitar(perfil: Perfil, id: IdRegra, agora = new Date().toISOString()): Perfil {
  const regras = perfil.regras.map((r) =>
    r.id === id ? { ...r, rejeicoes: r.rejeicoes + 1, confianca: clamp(r.confianca - PASSO_REJEICAO), ativa: clamp(r.confianca - PASSO_REJEICAO) > 0 } : r,
  );
  return registrar({ ...perfil, regras }, { em: agora, tipo: "rejeitou", regra: id, detalhe: `"${CATALOGO[id].rotulo}" recuada` });
}

export function alternar(perfil: Perfil, id: IdRegra, ativa: boolean, agora = new Date().toISOString()): Perfil {
  const regras = perfil.regras.map((r) => (r.id === id ? { ...r, ativa } : r));
  return registrar(
    { ...perfil, regras },
    { em: agora, tipo: ativa ? "ativou" : "desativou", regra: id, detalhe: `"${CATALOGO[id].rotulo}" ${ativa ? "ligada" : "desligada"} pela pessoa` },
  );
}

/** Regras que o agente aplica SOZINHO, sem perguntar. É o momento mágico da demo. */
export function regrasAutomaticas(perfil: Perfil): Regra[] {
  return perfil.regras.filter((r) => r.ativa && r.confianca >= LIMIAR_AUTO);
}

/** Regras ativas mas ainda sem confiança: aplicam com card de aprovação. */
export function regrasATestar(perfil: Perfil): Regra[] {
  return perfil.regras.filter((r) => r.ativa && r.confianca < LIMIAR_AUTO);
}

export function resumoPerfil(perfil: Perfil): string {
  const auto = regrasAutomaticas(perfil);
  if (auto.length === 0) return "Ainda não aprendi nada sobre você.";
  return `Aplico sozinho: ${auto.map((r) => r.rotulo.toLowerCase()).join(", ")}.`;
}
