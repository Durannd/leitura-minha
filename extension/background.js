/**
 * Service worker: dono do perfil e único caminho até o backend.
 * A chave do modelo nunca chega ao cliente — o content script não fala com a OpenRouter, fala comigo.
 */
import { aprovar, alternar, aprovarPorVoz, lerPerfil, gravarPerfil, regrasAutomaticas, rejeitar } from "./perfil.js";
import { IDS_ESTRUTURA, interpretarLocal } from "./comando.js";
import { EXEMPLO, contextoUtil, gravarContexto, lerContexto, paraContextoServidor } from "./contexto.js";

const API = "http://localhost:3010/api/adapt";
const API_COMANDO = "http://localhost:3010/api/comando";

/** Páginas onde a extensão não toca, nunca. Decisão de produto, não de engenharia. */
const NEGADOS = [/^https?:\/\/[^/]*\b(bank|banco|itau|bradesco|nubank|santander)\b/i, /mail\.google\.com/, /^https?:\/\/[^/]*\/(login|signin|checkout|payment)/i];

export function paginaPermitida(url = "") {
  return !NEGADOS.some((re) => re.test(url));
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

async function adaptar(payload) {
  if (!paginaPermitida(payload.url)) {
    return { ok: false, erro: "Esta página está na sua lista de nunca-tocar (banco, e-mail, checkout)." };
  }
  const perfil = await lerPerfil();
  const ctx = await lerContexto();
  const temContexto = contextoUtil(ctx);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, perfil, contexto: temContexto ? paraContextoServidor(ctx) : null }),
      signal: ctrl.signal,
    });
    const dados = await r.json();
    if (!r.ok) return { ok: false, erro: dados?.erro ?? `HTTP ${r.status}` };
    return { ok: true, dados, automaticas: regrasAutomaticas(perfil).length, temContexto };
  } catch (e) {
    return { ok: false, erro: e.name === "AbortError" ? "O servidor demorou demais." : String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Interpretação remota: só entra quando o léxico local ficou em dúvida.
 * Teto de 4s — a barra nunca pode ficar travada esperando rede num comando de voz.
 */
async function comandoRemoto(frase) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(API_COMANDO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frase, ids: IDS_ESTRUTURA }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const cmd = await r.json();
    if (!cmd || typeof cmd !== "object") throw new Error("resposta vazia");
    return { ok: true, cmd: { ligar: [], desligar: [], limites: {}, acoes: [], ...cmd, frase, remoto: true } };
  } catch (e) {
    // falha da rota NUNCA trava a barra: devolve o palpite local e segue a vida
    return { ok: false, erro: String(e?.message || e), cmd: interpretarLocal(frase) };
  } finally {
    clearTimeout(t);
  }
}

/** Ctrl+Shift+V: acorda o microfone na aba que a pessoa está lendo. */
chrome.commands?.onCommand.addListener(async (cmd) => {
  if (cmd !== "falar") return;
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!t?.id) return;
  try { await chrome.tabs.sendMessage(t.id, { tipo: "OUVIR" }); } catch {}
});

chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
  (async () => {
    switch (msg?.tipo) {
      case "ADAPTAR":
        responder(await adaptar(msg.payload));
        break;
      case "PERFIL":
        responder({ ok: true, perfil: await lerPerfil() });
        break;
      case "APROVAR": {
        const p = await gravarPerfil(aprovar(await lerPerfil(), msg.regra, msg.motivo));
        responder({ ok: true, perfil: p });
        break;
      }
      case "REJEITAR": {
        const p = await gravarPerfil(rejeitar(await lerPerfil(), msg.regra));
        responder({ ok: true, perfil: p });
        break;
      }
      case "ALTERNAR": {
        const p = await gravarPerfil(alternar(await lerPerfil(), msg.regra, msg.ativa));
        responder({ ok: true, perfil: p });
        break;
      }
      case "CONTEXTO":
        responder({ ok: true, contexto: await lerContexto() });
        break;
      case "SALVAR_CONTEXTO":
        responder({ ok: true, contexto: await gravarContexto(msg.contexto) });
        break;
      case "EXEMPLO_CONTEXTO":
        responder({ ok: true, contexto: await gravarContexto(EXEMPLO) });
        break;
      case "APRENDER_VOZ": {
        let base = await lerPerfil();
        const lim = msg.limites ?? {};
        if (Object.keys(lim).length) base = { ...base, limites: { ...base.limites, ...lim } };
        const p = await gravarPerfil(aprovarPorVoz(base, msg.regras ?? [], msg.frase ?? ""));
        responder({ ok: true, perfil: p, automaticas: regrasAutomaticas(p).map((r) => r.id) });
        break;
      }
      case "COMANDO_REMOTO":
        responder(await comandoRemoto(msg.frase ?? ""));
        break;
      case "ZERAR": {
        const p = await gravarPerfil((await import("./perfil.js")).perfilNovo());
        responder({ ok: true, perfil: p });
        break;
      }
      default:
        responder({ ok: false, erro: "mensagem desconhecida" });
    }
  })();
  return true; // canal aberto para resposta assíncrona — sem isto, tudo falha em silêncio
});
