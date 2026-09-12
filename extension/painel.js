const LIMIAR = 0.7;
const $ = (id) => document.getElementById(id);
const msg = (m) => chrome.runtime.sendMessage(m);

const CAMPOS = ["meuCargo", "oQueEuFaco", "empresa", "oQueVende", "icp", "posicionamento", "tomDeVoz", "campanhasTexto", "concorrentesTexto", "restricoesTexto"];

// ---------- abas ----------
function aba(qual) {
  $("ab-perfil").classList.toggle("on", qual === "perfil");
  $("ab-ctx").classList.toggle("on", qual === "ctx");
  $("pg-perfil").hidden = qual !== "perfil";
  $("pg-ctx").hidden = qual !== "ctx";
}
$("ab-perfil").onclick = () => aba("perfil");
$("ab-ctx").onclick = () => aba("ctx");

// ---------- perfil ----------
function pintarPerfil(p) {
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
          <div class="top"><b>${r.rotulo}</b>
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

document.addEventListener("change", async (e) => {
  const id = e.target.dataset?.id;
  if (!id) return;
  const r = await msg({ tipo: "ALTERNAR", regra: id, ativa: e.target.checked });
  pintarPerfil(r.perfil);
});

async function paraAba(tipo) {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { await chrome.tabs.sendMessage(t.id, { tipo }); }
  catch { alerta("A extensão não está ativa nesta aba. Aperte F5 na página."); }
}
function alerta(t) { $("regras").insertAdjacentHTML("afterbegin", `<div class="vazio" style="border-color:#e5b4b4;color:#b91c1c">${t}</div>`); }

$("rodar").onclick = () => paraAba("RODAR");
$("reverter").onclick = () => paraAba("REVERTER");
$("falar").onclick = () => paraAba("OUVIR");
$("zerar").onclick = async () => pintarPerfil((await msg({ tipo: "ZERAR" })).perfil);
$("exportar").onclick = async () => {
  const [{ perfil }, { contexto }] = [await msg({ tipo: "PERFIL" }), await msg({ tipo: "CONTEXTO" })];
  baixar({ perfilDeLeitura: perfil, contexto }, "leitura-minha.json");
};

function baixar(obj, nome) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  a.download = nome;
  a.click();
}

// ---------- contexto ----------
function pintarContexto(c) {
  CAMPOS.forEach((k) => { if ($(k)) $(k).value = c?.[k] ?? ""; });
}

async function salvar() {
  const c = {};
  CAMPOS.forEach((k) => { c[k] = $(k).value.trim(); });
  const atual = (await msg({ tipo: "CONTEXTO" })).contexto;
  const r = await msg({ tipo: "SALVAR_CONTEXTO", contexto: { ...atual, ...c } });
  pintarContexto(r.contexto);
  $("salvo").classList.add("on");
  setTimeout(() => $("salvo").classList.remove("on"), 1600);
}

$("salvar").onclick = salvar;
$("exemplo").onclick = async () => {
  pintarContexto((await msg({ tipo: "EXEMPLO_CONTEXTO" })).contexto);
  $("salvo").classList.add("on");
  setTimeout(() => $("salvo").classList.remove("on"), 1600);
};

// Ctrl/Cmd+S salva sem tirar a mão do teclado
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); salvar(); }
});

chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local") return;
  if (c.perfil) pintarPerfil(c.perfil.newValue);
  if (c.contexto) pintarContexto(c.contexto.newValue);
});

(async () => {
  pintarPerfil((await msg({ tipo: "PERFIL" })).perfil);
  pintarContexto((await msg({ tipo: "CONTEXTO" })).contexto);
})();
