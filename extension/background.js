/**
 * Service worker: dono do perfil e único caminho até o backend.
 * A chave do modelo nunca chega ao cliente — o content script não fala com a OpenRouter, fala comigo.
 */
import { aprovar, alternar, lerPerfil, gravarPerfil, regrasAutomaticas, rejeitar } from "./perfil.js";

const API = "http://localhost:3010/api/adapt";

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
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, perfil }),
      signal: ctrl.signal,
    });
    const dados = await r.json();
    if (!r.ok) return { ok: false, erro: dados?.erro ?? `HTTP ${r.status}` };
    return { ok: true, dados, automaticas: regrasAutomaticas(perfil).length };
  } catch (e) {
    return { ok: false, erro: e.name === "AbortError" ? "O servidor demorou demais." : String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

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
