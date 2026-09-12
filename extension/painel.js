const LIMIAR = 0.7;
const $ = (id) => document.getElementById(id);

async function perfil() {
  const r = await chrome.runtime.sendMessage({ tipo: "PERFIL" });
  return r.perfil;
}

function pintar(p) {
  const box = $("regras");
  if (!p.regras.length) {
    box.innerHTML = `<div class="vazio">Ainda não aprendi nada sobre você.<br>Abra um artigo e clique em <b>Adaptar para mim</b>.</div>`;
  } else {
    box.innerHTML = p.regras
      .slice()
      .sort((a, b) => b.confianca - a.confianca)
      .map((r) => {
        const auto = r.ativa && r.confianca >= LIMIAR;
        return `<div class="r">
          <div class="top">
            <b>${r.rotulo}</b>
            <span style="display:flex;gap:7px;align-items:center">
              <span class="${auto ? "auto" : "testando"}">${auto ? "automático" : "testando"}</span>
              <label class="sw"><input type="checkbox" data-id="${r.id}" ${r.ativa ? "checked" : ""}><i></i></label>
            </span>
          </div>
          <div class="motivo">“${r.motivo}”</div>
          <div class="bar"><i style="width:${Math.round(r.confianca * 100)}%"></i></div>
          <div class="meta"><span>confiança ${Math.round(r.confianca * 100)}%</span><span>${r.aprovacoes} aprovações${r.rejeicoes ? ` · ${r.rejeicoes} recusas` : ""}</span></div>
        </div>`;
      })
      .join("");
  }
  $("historico").innerHTML = p.historico.length
    ? p.historico.slice(-12).reverse().map((h) => `<div class="h"><span>${new Date(h.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>${h.detalhe}</div>`).join("")
    : `<div class="h" style="color:#9aa0a8">nada ainda</div>`;
}

async function paraAba(tipo) {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { await chrome.tabs.sendMessage(aba.id, { tipo }); }
  catch { alert("A extensão não está ativa nesta aba. Aperte F5 na página."); }
}

document.addEventListener("change", async (e) => {
  const id = e.target.dataset?.id;
  if (!id) return;
  const r = await chrome.runtime.sendMessage({ tipo: "ALTERNAR", regra: id, ativa: e.target.checked });
  pintar(r.perfil);
});

$("rodar").onclick = () => paraAba("RODAR");
$("reverter").onclick = () => paraAba("REVERTER");
$("zerar").onclick = async () => { const r = await chrome.runtime.sendMessage({ tipo: "ZERAR" }); pintar(r.perfil); };
$("exportar").onclick = async () => {
  const p = await perfil();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }));
  a.download = "meu-perfil-de-leitura.json";
  a.click();
};

async function pintarEmpresa() {
  try {
    const c = await (await fetch("http://localhost:3010/api/contexto")).json();
    $("empresa").innerHTML = `
      <div class="emp">
        <div class="nome"><i></i>${c.empresa} <span style="margin-left:auto;font:500 11px system-ui;color:#9aa0a8">contexto v${c.versao}</span></div>
        <div class="pos">${c.posicionamento}</div>
      </div>
      <div class="emp">
        <div class="nome" style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#858b93">Campanhas</div>
        ${c.campanhas.map((k) => `<div class="camp"><span class="dot" style="background:${k.status === "ativa" ? "#16a34a" : "#c9ccd1"}"></span><div><b>${k.nome}</b><span>${k.canal} · ${k.metrica}</span>${k.problema ? `<span style="color:#b91c1c">⚠ ${k.problema}</span>` : ""}</div></div>`).join("")}
      </div>
      <div class="emp">
        <div class="nome" style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#858b93">Concorrentes monitorados</div>
        ${c.concorrentes.map((k) => `<div class="conc"><b>${k.nome}</b>${k.movimentos.length} movimentos registrados</div>`).join("")}
      </div>`;
  } catch {
    $("empresa").innerHTML = `<div class="vazio">Backend fora do ar (localhost:3010).</div>`;
  }
}
pintarEmpresa();

chrome.storage.onChanged.addListener((c, area) => { if (area === "local" && c.perfil) pintar(c.perfil.newValue); });
perfil().then(pintar);
