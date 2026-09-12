/** Content script: extrai o artigo, mostra a barra, re-renderiza no lugar. Não fala com a rede — só com o service worker. */
(() => {
  if (window.__leituraMinha) return;
  window.__leituraMinha = true;

  const RUIDO = /comment|sidebar|footer|header|nav|menu|promo|share|related|\bad-|advert|newsletter|cookie/i;
  const ESTADO = { alvo: null, adaptado: null, ultimo: null };

  const vivo = () => { try { return !!chrome.runtime?.id; } catch { return false; } };

  function pontuar(el) {
    if (RUIDO.test(`${el.className} ${el.id}`)) return -1;
    const ps = el.querySelectorAll("p");
    if (ps.length < 3) return 0;
    let texto = 0, links = 0;
    ps.forEach((p) => { texto += p.innerText.trim().length; });
    el.querySelectorAll("a").forEach((a) => { links += a.innerText.length; });
    const densidade = texto ? links / texto : 1;
    return densidade > 0.35 ? 0 : texto * (1 - densidade);
  }

  const MIN_TEXTO = 320;

  /**
   * Escada de estratégias, da mais precisa à mais bruta. Só desiste quando nem o body tem texto:
   * é melhor adaptar um pouco a mais da página do que dizer "não achei artigo" para quem precisa ler.
   */
  function raizDoArtigo() {
    // 1. semântica
    for (const sel of ["article", "main", '[role="main"]', "[itemprop='articleBody']"]) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > MIN_TEXTO) return el;
    }
    // 2. densidade de texto, com limiar baixo
    let melhor = null, max = 0;
    for (const el of document.querySelectorAll("div,section,article,main,td")) {
      const s = pontuar(el);
      if (s > max) { max = s; melhor = el; }
    }
    if (melhor && max > 250) return melhor;
    // 3. maior aglomerado de <p>, ignorando pontuação
    let maior = null, maiorLen = 0;
    for (const el of document.querySelectorAll("div,section,article,main")) {
      if (el.querySelectorAll("p,li,h2,h3").length < 2) continue;
      const len = el.innerText.trim().length;
      // o pai sempre tem mais texto que o filho: exige ganho real para subir na árvore
      if (len > maiorLen * 1.15) { maiorLen = len; maior = el; }
    }
    if (maior && maiorLen > MIN_TEXTO) return maior;
    // 4. último recurso: o corpo inteiro
    return document.body && document.body.innerText.trim().length > MIN_TEXTO ? document.body : null;
  }

  const LIXO = "script,style,noscript,iframe,form,svg,button,nav,header,footer,aside,[role='navigation'],[role='banner'],[role='contentinfo'],#lm-barra,#lm-adaptado";

  function extrair() {
    const raiz = raizDoArtigo();
    if (!raiz) return null;
    const copia = raiz.cloneNode(true);
    copia.querySelectorAll(LIXO).forEach((n) => n.remove());
    const texto = copia.innerText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (texto.length < MIN_TEXTO) return null;
    return { raiz, titulo: document.title, url: location.href, texto: texto.slice(0, 24000) };
  }

  const TIPOS = {
    concorrente: { rotulo: "concorrente", solid: "#c2410c", suave: "rgba(234,88,12,.28)" },
    campanha: { rotulo: "campanha ativa", solid: "#1d4ed8", suave: "rgba(37,99,235,.26)" },
    oportunidade: { rotulo: "oportunidade", solid: "#15803d", suave: "rgba(22,163,74,.26)" },
    contradicao: { rotulo: "contradição", solid: "#a21caf", suave: "rgba(192,38,211,.26)" },
    risco: { rotulo: "risco", solid: "#b91c1c", suave: "rgba(220,38,38,.26)" },
  };

  const PALETAS = {
    claro: { fundo: "#ffffff", texto: "#16181c", caixa: "#f4f5f7", borda: "#e3e5e8" },
    sepia: { fundo: "#f6efe2", texto: "#3b332a", caixa: "#efe5d2", borda: "#ddd0b8" },
    "alto-contraste": { fundo: "#000000", texto: "#ffffff", caixa: "#161616", borda: "#5a5a5a" },
    "escuro-suave": { fundo: "#1b1d21", texto: "#e4e8ee", caixa: "#24272c", borda: "#3a3e45" },
  };

  /** Primeiro fundo opaco subindo na árvore. Página escura com nosso texto #111 é texto invisível. */
  function fundoDaPagina(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim());
        if (parseFloat(a) > 0.5) return [+r, +g, +b];
      }
      n = n.parentElement;
    }
    const c = getComputedStyle(document.documentElement).backgroundColor.match(/rgba?\(([^)]+)\)/);
    return c ? c[1].split(",").slice(0, 3).map(Number) : [255, 255, 255];
  }

  /** "original" significa respeitar a página, não ignorá-la: em página escura, paleta escura. */
  function resolverPaleta(nome, alvo) {
    if (nome && nome !== "original" && PALETAS[nome]) return PALETAS[nome];
    const [r, g, b] = fundoDaPagina(alvo);
    const luz = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luz < 0.5 ? PALETAS["escuro-suave"] : PALETAS.claro;
  }

  /** Esconde o original em vez de destruí-lo: reverter fica garantido e sem perda de listeners. */
  function renderizar(raiz, d) {
    reverter();
    ESTADO.alvo = raiz;
    ESTADO.ultimo = d;
    const cor = resolverPaleta(d.paleta, raiz);

    const host = document.createElement("div");
    host.id = "lm-adaptado";
    host.style.cssText = "all:initial;display:block;";
    const sh = host.attachShadow({ mode: "open" });
    sh.innerHTML = `
      <style>
        :host{all:initial}
        .w{font-family:system-ui,-apple-system,sans-serif;line-height:1.7;color:${cor.texto};background:${cor.fundo};max-width:68ch;padding:24px 26px;border-radius:14px;border:1px solid ${cor.borda}}
        .w *{color:inherit}
        .selo{display:inline-flex;align-items:center;gap:6px;font:500 12px system-ui;color:${cor.texto};opacity:.7;border:1px solid ${cor.borda};padding:4px 10px;border-radius:999px;margin-bottom:14px}
        .expl{font:italic 400 14px/1.6 system-ui;opacity:.85;border-left:3px solid ${cor.borda};padding:6px 0 6px 12px;margin:0 0 22px}
        .diag{background:${cor.caixa};border:1px solid ${cor.borda};border-radius:10px;padding:12px 14px;margin:0 0 16px}
        .diag b{display:block;font:600 11px system-ui;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin-bottom:6px}
        .diag ul{margin:0;padding-left:18px}
        .diag li{font:400 13px/1.6 system-ui;opacity:.9}
        h3{font:600 1.05rem system-ui;margin:26px 0 8px}
        p{margin:0 0 16px;font-size:1.05rem}
        .resumo{background:${cor.caixa};border:1px solid ${cor.borda};border-radius:10px;padding:14px 16px;margin:0 0 22px}
        .resumo b{display:block;font:600 12px system-ui;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin-bottom:6px}
        ol{margin:0 0 18px;padding-left:0;list-style:none;counter-reset:p}
        ol li{counter-increment:p;position:relative;padding-left:42px;margin:0 0 14px}
        ol li::before{content:counter(p);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:${cor.caixa};border:1px solid ${cor.borda};display:flex;align-items:center;justify-content:center;font:600 13px system-ui}
        .gloss{margin-top:26px;background:${cor.caixa};border:1px solid ${cor.borda};border-radius:10px;padding:14px 16px}
        .gloss b{display:block;font:600 12px system-ui;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin-bottom:8px}
        .gloss dt{font-weight:600;margin-top:8px}
        .gloss dd{margin:2px 0 0;opacity:.85;font-size:.95rem}
        .met{margin-top:18px;font:400 12px system-ui;opacity:.6}

        /* grifo da âncora: a frase do artigo que gerou o insight */
        mark.lm-a{background:linear-gradient(transparent 58%, var(--lm-cor) 58%);background-size:0% 100%;background-repeat:no-repeat;color:inherit;padding:1px 0;border-radius:2px;animation:lm-grifo .55s cubic-bezier(.22,1,.36,1) forwards;animation-delay:var(--lm-d)}
        @keyframes lm-grifo{to{background-size:100% 100%}}
        mark.lm-a sup{font:700 10px system-ui;color:#fff;background:var(--lm-solid);border-radius:999px;padding:1px 5px;margin-left:4px;vertical-align:super;opacity:0;animation:lm-num .3s ease forwards;animation-delay:calc(var(--lm-d) + .4s)}
        @keyframes lm-num{to{opacity:1}}

        /* card de insight ancorado no parágrafo */
        .lm-i{border:1px solid var(--lm-solid);border-left-width:4px;border-radius:12px;padding:14px 16px;margin:6px 0 22px;background:${cor.caixa};opacity:0;transform:translateY(10px);animation:lm-sobe .45s cubic-bezier(.22,1,.36,1) forwards;animation-delay:var(--lm-d)}
        @keyframes lm-sobe{to{opacity:1;transform:none}}
        .lm-i .cab{display:flex;align-items:center;gap:8px;margin-bottom:7px}
        .lm-i .n{font:700 10px system-ui;color:#fff;background:var(--lm-solid);border-radius:999px;padding:2px 7px;flex:none}
        .lm-i .tag{font:700 10px system-ui;letter-spacing:.07em;text-transform:uppercase;color:var(--lm-solid)}
        .lm-i .ref{font:500 11px system-ui;opacity:.55;margin-left:auto;text-align:right}
        .lm-i h5{margin:0 0 6px;font:600 14.5px/1.4 system-ui}
        .lm-i p{margin:0 0 10px;font:400 13.5px/1.65 system-ui;opacity:.9}
        .lm-i .acao{display:flex;gap:8px;font:400 13px/1.6 system-ui;background:${cor.fundo};border:1px dashed var(--lm-solid);border-radius:9px;padding:10px 12px}
        .lm-i .acao b{font:700 10px system-ui;letter-spacing:.07em;text-transform:uppercase;color:var(--lm-solid);flex:none;padding-top:2px}

        /* faixa do contexto da empresa */
        .lm-emp{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font:500 12px system-ui;background:${cor.caixa};border:1px solid ${cor.borda};border-radius:999px;padding:7px 14px;margin:0 0 16px}
        .lm-emp .p{width:7px;height:7px;border-radius:50%;background:#16a34a;flex:none;box-shadow:0 0 0 3px rgba(22,163,74,.18)}
        .lm-emp .d{opacity:.55}
      </style>
      <div class="w"><div class="selo">✦ adaptado ao seu perfil${d.motor === "llm" ? "" : " · modo local"}</div></div>`;
    const w = sh.querySelector(".w");

    if (d.empresa) {
      const e = document.createElement("div");
      e.className = "lm-emp";
      e.innerHTML = `<span class="p"></span><b>${d.empresa.nome}</b><span class="d">·</span><span class="d">${d.empresa.campanhasAtivas} campanhas ativas · ${d.empresa.concorrentes} concorrentes monitorados · contexto v${d.empresa.versao}</span>`;
      w.appendChild(e);
    }

    if (d.diagnostico?.length) {
      const dg = document.createElement("div");
      dg.className = "diag";
      const t = document.createElement("b");
      t.textContent = "O que eu vi nesta página";
      dg.appendChild(t);
      const ul = document.createElement("ul");
      d.diagnostico.slice(0, 4).forEach((x) => {
        const li = document.createElement("li");
        li.textContent = `${x.rotulo}: ${x.evidencia}`;
        ul.appendChild(li);
      });
      dg.appendChild(ul);
      w.appendChild(dg);
    }

    if (d.explicacao) {
      const e = document.createElement("div");
      e.className = "expl";
      e.textContent = d.explicacao;
      w.appendChild(e);
    }

    const elementos = []; // para ancorar os insights no parágrafo certo
    let ol = null;
    for (const b of d.blocos ?? []) {
      if (b.tipo === "passo") {
        if (!ol) { ol = document.createElement("ol"); w.appendChild(ol); }
        const li = document.createElement("li");
        li.textContent = b.texto;
        ol.appendChild(li);
        elementos.push(li);
        continue;
      }
      ol = null;
      if (b.tipo === "resumo") {
        const d2 = document.createElement("div");
        d2.className = "resumo";
        const t = document.createElement("b");
        t.textContent = b.titulo || "Do que se trata";
        const p = document.createElement("div");
        p.textContent = b.texto;
        d2.append(t, p);
        w.appendChild(d2);
      } else if (b.tipo === "subtitulo") {
        const h = document.createElement("h3");
        h.textContent = b.texto;
        w.appendChild(h);
      } else {
        if (b.titulo) { const h = document.createElement("h3"); h.textContent = b.titulo; w.appendChild(h); }
        const p = document.createElement("p");
        p.textContent = b.texto;
        w.appendChild(p);
        elementos.push(p);
      }
    }

    ancorarInsights(w, elementos, d.insights ?? []);

    if (d.glossario?.length) {
      const g = document.createElement("dl");
      g.className = "gloss";
      const t = document.createElement("b");
      t.textContent = "Termos do texto";
      g.appendChild(t);
      d.glossario.forEach((x) => {
        const dt = document.createElement("dt"); dt.textContent = x.termo;
        const dd = document.createElement("dd"); dd.textContent = x.definicao;
        g.append(dt, dd);
      });
      w.appendChild(g);
    }

    if (d.metricas) {
      const m = document.createElement("div");
      m.className = "met";
      m.textContent = `frase média: ${d.metricas.antes.palavrasPorFrase} → ${d.metricas.depois.palavrasPorFrase} palavras · maior bloco: ${d.metricas.antes.maiorBloco} → ${d.metricas.depois.maiorBloco} palavras`;
      w.appendChild(m);
    }

    raiz.style.display = "none";
    raiz.parentNode.insertBefore(host, raiz);
    ESTADO.adaptado = host;
    host.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  const semAcento = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");

  /**
   * Prende cada insight ao parágrafo que o gerou: grifa a âncora no texto e insere o card logo abaixo.
   * É isto que separa o produto de uma sidebar de chat — o insight não flutua, ele mora na frase.
   */
  function ancorarInsights(wrap, elementos, insights) {
    if (!insights.length) return;
    let n = 0;
    const orfaos = [];

    for (const ins of insights) {
      const alvoNorm = semAcento(ins.ancora).trim();
      if (alvoNorm.length < 8) { orfaos.push(ins); continue; }
      // casa pelo maior prefixo disponível: a adaptação reescreve o texto, então a âncora raramente é literal
      let achou = null, achouIdx = -1;
      const palavras = alvoNorm.split(" ");
      for (let corte = palavras.length; corte >= 3 && !achou; corte--) {
        const pedaco = palavras.slice(0, corte).join(" ");
        for (let i = 0; i < elementos.length; i++) {
          const idx = semAcento(elementos[i].textContent).indexOf(pedaco);
          if (idx >= 0) { achou = elementos[i]; achouIdx = corte; break; }
        }
      }
      n += 1;
      const tipo = TIPOS[ins.tipo] ?? TIPOS.oportunidade;
      const atraso = `${0.25 + n * 0.18}s`;

      if (achou) {
        grifar(achou, palavras.slice(0, achouIdx).join(" "), n, tipo, atraso);
        achou.insertAdjacentElement("afterend", cardInsight(ins, n, tipo, atraso));
      } else {
        orfaos.push({ ...ins, _n: n, _tipo: tipo, _atraso: atraso });
      }
    }
    // insight cuja âncora sumiu na reescrita ainda aparece — no fim, sem grifo
    orfaos.forEach((o, k) => {
      const tipo = o._tipo ?? TIPOS[o.tipo] ?? TIPOS.oportunidade;
      wrap.appendChild(cardInsight(o, o._n ?? n + k + 1, tipo, o._atraso ?? `${0.3 + (n + k) * 0.18}s`));
    });
  }

  /** Grifa dentro do nó de texto, sem destruir o resto do parágrafo. */
  function grifar(el, trechoNorm, n, tipo, atraso) {
    const bruto = el.textContent;
    const idx = semAcento(bruto).indexOf(trechoNorm);
    if (idx < 0) return;
    const fim = idx + trechoNorm.length;
    const antes = bruto.slice(0, idx);
    const meio = bruto.slice(idx, fim);
    const depois = bruto.slice(fim);
    el.textContent = "";
    el.append(document.createTextNode(antes));
    const m = document.createElement("mark");
    m.className = "lm-a";
    m.style.setProperty("--lm-cor", tipo.suave);
    m.style.setProperty("--lm-solid", tipo.solid);
    m.style.setProperty("--lm-d", atraso);
    m.append(document.createTextNode(meio));
    const sup = document.createElement("sup");
    sup.textContent = n;
    m.appendChild(sup);
    el.append(m, document.createTextNode(depois));
  }

  function cardInsight(ins, n, tipo, atraso) {
    const c = document.createElement("div");
    c.className = "lm-i";
    c.style.setProperty("--lm-solid", tipo.solid);
    c.style.setProperty("--lm-d", atraso);
    const cab = document.createElement("div");
    cab.className = "cab";
    cab.innerHTML = `<span class="n">${n}</span><span class="tag">${tipo.rotulo}</span>${ins.refere ? `<span class="ref">${ins.refere}</span>` : ""}`;
    const h = document.createElement("h5");
    h.textContent = ins.titulo;
    const p = document.createElement("p");
    p.textContent = ins.texto;
    const a = document.createElement("div");
    a.className = "acao";
    const b = document.createElement("b");
    b.textContent = "faça";
    const at = document.createElement("span");
    at.textContent = ins.acao;
    a.append(b, at);
    c.append(cab, h, p, a);
    return c;
  }

  function reverter() {
    if (ESTADO.adaptado) ESTADO.adaptado.remove();
    if (ESTADO.alvo) ESTADO.alvo.style.display = "";
    ESTADO.adaptado = null;
  }

  // ---------- barra flutuante ----------
  let barra;
  function montarBarra() {
    if (document.getElementById("lm-barra")) return;
    const host = document.createElement("div");
    host.id = "lm-barra";
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;right:18px;bottom:18px;";
    document.documentElement.appendChild(host);
    barra = host.attachShadow({ mode: "open" });
    barra.innerHTML = `
      <style>
        :host{all:initial}
        .b{display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif}
        button{all:unset;cursor:pointer;padding:11px 16px;border-radius:999px;background:#111;color:#fff;font:600 13px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.28)}
        button.g{background:#fff;color:#111;border:1px solid #dcdcdc}
        .card button.g{background:#fff;color:#111;border:1px solid #dcdcdc}
        button[disabled]{opacity:.55;cursor:default}
        .card{position:absolute;right:0;bottom:56px;width:320px;background:#fff;color:#111;border:1px solid #e2e2e2;border-radius:14px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);font-family:system-ui}
        .card h4{margin:0 0 6px;font:600 14px system-ui}
        .card p{margin:0 0 14px;font:400 13px/1.55 system-ui;color:#444}
        .card .row{display:flex;gap:8px}
        .card button{padding:9px 14px;font-size:13px}
        .hidden{display:none}
      </style>
      <div class="b">
        <button id="go">Adaptar para mim</button>
        <button id="undo" class="g">Ver original</button>
        <div id="card" class="card hidden"></div>
      </div>`;
    barra.getElementById("go").addEventListener("click", rodar);
    barra.getElementById("undo").addEventListener("click", reverter);
  }

  function ocupado(b) {
    const go = barra?.getElementById("go");
    if (go) { go.disabled = b; go.textContent = b ? "Adaptando…" : "Adaptar para mim"; }
  }

  /** Fila de aprovação: nada entra no perfil sem a pessoa dizer sim, um de cada vez. */
  function pedirAprovacao(pendentes) {
    const fila = (pendentes ?? []).slice();
    const card = barra.getElementById("card");
    const proximo = () => {
      const r = fila.shift();
      if (!r) { card.classList.add("hidden"); return; }
      card.classList.remove("hidden");
      const corpo = r.novo
        ? `Vi nesta página: <b>${r.motivo}</b>. Já apliquei aqui. Quer que eu passe a fazer isso sozinho nas próximas?`
        : `Você disse: “${r.motivo}”. Se eu fixar, aplico sozinho nas próximas páginas — e você desliga quando quiser.`;
      card.innerHTML = `<h4>${r.novo ? `Fixar “${r.rotulo}”?` : `Fixar “${r.rotulo}” no seu perfil?`}</h4>
        <p>${corpo}</p>
        <div class="row"><button id="sim">Sim, aprenda isso</button><button id="nao" class="g">Agora não</button></div>
        ${fila.length ? `<p style="margin:10px 0 0;font-size:11.5px;color:#999">mais ${fila.length} sugest${fila.length > 1 ? "ões" : "ão"} depois desta</p>` : ""}`;
      card.querySelector("#sim").onclick = async () => {
        await chrome.runtime.sendMessage({ tipo: "APROVAR", regra: r.id, motivo: r.motivo });
        proximo();
      };
      card.querySelector("#nao").onclick = async () => {
        await chrome.runtime.sendMessage({ tipo: "REJEITAR", regra: r.id });
        proximo();
      };
    };
    proximo();
  }

  /** Aviso dentro do Shadow DOM. alert() bloqueia a página e mata a extensão — nunca usar. */
  function avisar(texto, detalhe) {
    const card = barra.getElementById("card");
    card.classList.remove("hidden");
    card.innerHTML = `<h4>${texto}</h4>${detalhe ? `<p>${detalhe}</p>` : ""}<div class="row"><button id="ok" class="g">Entendi</button></div>`;
    card.querySelector("#ok").onclick = () => card.classList.add("hidden");
  }

  async function rodar() {
    if (!vivo()) { avisar("Extensão recarregada", "Aperte F5 nesta página para reativar."); return; }
    ocupado(true);
    try {
      const art = extrair();
      if (!art) {
        avisar("Não achei texto para adaptar aqui", "Esta página tem pouco texto corrido — tente numa página de artigo.");
        return;
      }
      const res = await chrome.runtime.sendMessage({
        tipo: "ADAPTAR",
        payload: { titulo: art.titulo, url: art.url, texto: art.texto },
      });
      if (!res?.ok) { avisar("Não consegui adaptar", res?.erro ?? "erro desconhecido"); return; }
      renderizar(art.raiz, res.dados);
      pedirAprovacao(res.dados.pedindoAprovacao);
    } finally {
      ocupado(false);
    }
  }

  chrome.runtime.onMessage.addListener((msg, _s, responder) => {
    if (msg?.tipo === "RODAR") { rodar(); responder({ ok: true }); }
    if (msg?.tipo === "REVERTER") { reverter(); responder({ ok: true }); }
    return true;
  });

  montarBarra();
})();
