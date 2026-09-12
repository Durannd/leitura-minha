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

    if (!d.empresa) {
      const e = document.createElement("div");
      e.className = "lm-emp";
      e.innerHTML = `<span class="p" style="background:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.18)"></span><b>Sem contexto</b><span class="d">·</span><span class="d">preencha "Meu contexto" no painel para receber insights da sua empresa</span>`;
      w.appendChild(e);
    }

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

        /* ---- barra de comando ---- */
        .mic{background:#fff;color:#111;border:1px solid #dcdcdc;font-size:16px;padding:9px 13px;line-height:1}
        .mic.on{background:#b91c1c;color:#fff;border-color:#b91c1c}
        .voz{position:absolute;right:0;bottom:56px;width:340px;background:#fff;color:#111;border:1px solid #e2e2e2;border-radius:14px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);font-family:system-ui}
        .voz.ouvindo{border-color:#b91c1c}
        .voz.nao-entendi{border-color:#d97706;border-width:2px}
        .vtop{display:flex;align-items:center;gap:8px;font:600 12px system-ui}
        .anel{width:10px;height:10px;border-radius:50%;background:#c9ccd1;flex:none}
        .voz.ouvindo .anel{background:#b91c1c;animation:lm-pulso 1.1s ease-out infinite}
        .voz.aplicando .anel{background:#15803d}
        .voz.nao-entendi .anel{background:#d97706}
        @keyframes lm-pulso{0%{box-shadow:0 0 0 0 rgba(185,28,28,.45)}70%{box-shadow:0 0 0 9px rgba(185,28,28,0)}100%{box-shadow:0 0 0 0 rgba(185,28,28,0)}}
        .ens{margin-left:auto;font:500 10.5px system-ui;color:#9aa0a8;letter-spacing:.03em}
        .parcial{font:italic 400 13.5px/1.5 system-ui;color:#7c8289;margin:9px 0 0;min-height:20px}
        .chips{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 0}
        .chips span{font:600 11px system-ui;background:#f1f2f4;color:#2a2d31;border-radius:999px;padding:4px 9px}
        .palpites{display:flex;flex-direction:column;gap:5px;margin:9px 0 0}
        .palpites button{all:unset;cursor:pointer;font:500 12.5px system-ui;color:#111;background:#f6f7f8;border:1px solid #e4e6e9;border-radius:9px;padding:7px 10px;box-shadow:none}
        .palpites button:hover{background:#eceef0}
        .entrada{all:unset;display:block;box-sizing:border-box;width:100%;margin:9px 0 0;padding:9px 11px;border:1px solid #dcdfe2;border-radius:9px;font:400 13px system-ui;color:#15171a;background:#fff}
        .entrada:focus{border-color:#111;box-shadow:0 0 0 2px rgba(0,0,0,.08)}
        .dicaz{font:400 11px system-ui;color:#9aa0a8;margin:7px 0 0}
        .feito{display:flex;align-items:center;gap:8px;font:500 12.5px system-ui;color:#15803d;margin:9px 0 0}
        .feito button{all:unset;cursor:pointer;font:600 12.5px system-ui;color:#111;text-decoration:underline;box-shadow:none;background:none;padding:0}
      </style>
      <div class="b">
        <div id="voz" class="voz hidden">
          <div class="vtop"><span class="anel" id="vanel"></span><span id="vrot">Comando</span><span id="vens" class="ens hidden">modo ensaio</span></div>
          <div id="vparcial" class="parcial"></div>
          <div id="vchips" class="chips"></div>
          <div id="vpalpites" class="palpites"></div>
          <input id="ventrada" class="entrada hidden" placeholder="ex.: deixa as frases bem curtas" autocomplete="off" spellcheck="false">
          <div id="vdica" class="dicaz hidden">↑ ↓ percorre os comandos do roteiro · Enter aplica · Esc fecha</div>
          <div id="vfeito" class="feito hidden"></div>
        </div>
        <button id="mic" class="mic" title="Falar um comando (Ctrl+Shift+V) · D para digitar">🎙</button>
        <button id="go">Adaptar para mim</button>
        <button id="undo" class="g">Ver original</button>
        <div id="card" class="card hidden"></div>
      </div>`;
    barra.getElementById("go").addEventListener("click", rodar);
    barra.getElementById("undo").addEventListener("click", reverter);
    barra.getElementById("mic").addEventListener("click", () => Voz.alternar());
    ligarTeclado();
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


  // ================= comando de voz e teclado =================

  /** Roteiro da demo: as setas percorrem isto no modo digitado. É ensaio, e a barra diz isso. */
  const ROTEIRO = [
    "adapta essa tela em passos numerados com fundo escuro",
    "deixa as frases bem curtas e destaca os termos técnicos",
    "aumenta a fonte",
    "tira as cores",
    "volta pro original",
  ];

  const CORES_D = {
    amarelo: { solid: "#a16207", suave: "rgba(234,179,8,.38)" },
    azul: { solid: "#1d4ed8", suave: "rgba(37,99,235,.28)" },
    verde: { solid: "#15803d", suave: "rgba(22,163,74,.28)" },
    vermelho: { solid: "#b91c1c", suave: "rgba(220,38,38,.28)" },
    rosa: { solid: "#a21caf", suave: "rgba(192,38,211,.28)" },
    roxo: { solid: "#6d28d9", suave: "rgba(124,58,237,.28)" },
  };

  // ---------- aparência: muda a tela AGORA, sem passar pela rede ----------
  const APAR = { paleta: null, escala: 1, destaques: { ligado: true, cor: null } };

  const shadowAdaptado = () => ESTADO.adaptado?.shadowRoot ?? null;

  /** Reescreve um <style> de override no shadow já renderizado. Nada de re-render, nada de rede. */
  function aplicarAparencia() {
    const sh = shadowAdaptado();
    const w = sh?.querySelector(".w");
    if (!w) return false;
    let st = sh.getElementById("lm-ap");
    if (!st) { st = document.createElement("style"); st.id = "lm-ap"; sh.appendChild(st); }
    const cor = resolverPaleta(APAR.paleta ?? ESTADO.ultimo?.paleta ?? "original", ESTADO.alvo ?? document.body);
    let css = `
      .w{color:${cor.texto}!important;background:${cor.fundo}!important;border-color:${cor.borda}!important}
      .selo,.diag,.resumo,.gloss,.lm-emp{background:${cor.caixa}!important;border-color:${cor.borda}!important}
      .lm-i{background:${cor.caixa}!important}
      .expl{border-left-color:${cor.borda}!important}
      ol li::before{background:${cor.caixa}!important;border-color:${cor.borda}!important}
      .lm-i .acao{background:${cor.fundo}!important}`;
    if (APAR.destaques.ligado === false) {
      css += `
      mark.lm-a{background-image:none!important;animation:none!important;background-color:transparent!important}
      mark.lm-a sup{display:none!important}
      .lm-i{display:none!important}`;
    } else {
      const c = CORES_D[APAR.destaques.cor];
      if (c) css += `
      mark.lm-a{--lm-cor:${c.suave}!important;--lm-solid:${c.solid}!important}
      .lm-i{--lm-solid:${c.solid}!important}`;
    }
    st.textContent = css;
    w.style.zoom = String(APAR.escala);
    return true;
  }

  const Aparencia = {
    paleta(nome) { APAR.paleta = nome; return aplicarAparencia(); },
    fonte(passo) {
      APAR.escala = Math.max(0.8, Math.min(2, +(APAR.escala + 0.15 * (passo || 0)).toFixed(2)));
      return aplicarAparencia();
    },
    destaques(d) {
      if (!d) return false;
      APAR.destaques = { ligado: d.ligado !== false, cor: d.cor ?? APAR.destaques.cor };
      return aplicarAparencia();
    },
    restaurar(snap) { APAR.paleta = snap.paleta; APAR.escala = snap.escala; APAR.destaques = { ...snap.destaques }; return aplicarAparencia(); },
    instantaneo: () => ({ paleta: APAR.paleta, escala: APAR.escala, destaques: { ...APAR.destaques } }),
  };

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

  // ---------- a barra, em quatro estados ----------
  let desfazerTimer = null;

  const Barra = {
    abrir() { barra?.getElementById("voz")?.classList.remove("hidden"); },
    fechar() {
      const v = barra?.getElementById("voz");
      if (!v) return;
      v.classList.add("hidden");
      this.estado("ocioso");
    },
    /** ocioso | ouvindo | aplicando | nao-entendi */
    estado(nome) {
      const v = barra?.getElementById("voz");
      if (!v) return;
      v.classList.remove("ocioso", "ouvindo", "aplicando", "nao-entendi");
      v.classList.add(nome);
      const rot = barra.getElementById("vrot");
      const mic = barra.getElementById("mic");
      const rotulos = { ocioso: "Comando", ouvindo: "Ouvindo…", aplicando: "Aplicando", "nao-entendi": "Não entendi" };
      if (rot) rot.textContent = rotulos[nome] ?? "Comando";
      if (mic) mic.classList.toggle("on", nome === "ouvindo");
      if (nome !== "nao-entendi") barra.getElementById("vpalpites").innerHTML = "";
      if (nome === "ouvindo") { barra.getElementById("vchips").innerHTML = ""; barra.getElementById("vfeito").classList.add("hidden"); }
      if (nome !== "ocioso") this.abrir();
    },
    parcial(txt) {
      const p = barra?.getElementById("vparcial");
      if (p) p.textContent = txt ?? "";
    },
    chips(cmd) {
      const box = barra?.getElementById("vchips");
      if (!box) return;
      const itens = cmd?.chips?.length ? cmd.chips : (cmd?.eco ? cmd.eco.split(" · ") : []);
      box.innerHTML = "";
      itens.forEach((t) => { const s = document.createElement("span"); s.textContent = t; box.appendChild(s); });
    },
    /** Voz indisponível não é beco sem saída: o modo digitado é o mesmo caminho, com teclado. */
    semVoz(msg) {
      this.estado("nao-entendi");
      this.parcial(msg || "Microfone indisponível aqui.");
      abrirDigitado(true);
    },
    naoEntendi(frase, palpites) {
      this.estado("nao-entendi");
      this.parcial(frase ? `ouvi: “${frase}” — não achei um comando aí dentro` : "não entendi");
      const box = barra.getElementById("vpalpites");
      box.innerHTML = "";
      (palpites ?? PALPITES).slice(0, 3).forEach((p) => {
        const b = document.createElement("button");
        b.textContent = p;
        b.onclick = () => Comando.processar(p, "palpite");
        box.appendChild(b);
      });
      abrirDigitado(true);
    },
    desfazer(eco, ms, aoDesfazer) {
      const f = barra?.getElementById("vfeito");
      if (!f) return;
      clearTimeout(desfazerTimer);
      f.classList.remove("hidden");
      f.innerHTML = "";
      const t = document.createElement("span");
      t.textContent = `Feito: ${eco || "aplicado"} ·`;
      const b = document.createElement("button");
      b.textContent = "Desfazer";
      b.onclick = () => { clearTimeout(desfazerTimer); f.classList.add("hidden"); aoDesfazer?.(); };
      f.append(t, b);
      desfazerTimer = setTimeout(() => { f.classList.add("hidden"); if (!barra.getElementById("ventrada").classList.contains("hidden")) return; Barra.fechar(); }, ms ?? 8000);
    },
  };

  // ---------- modo digitado: plano B da demo, e o esqueleto de tudo ----------
  let roteiroIdx = -1;

  function abrirDigitado(manterEstado) {
    Barra.abrir();
    if (!manterEstado) Barra.estado("ocioso");
    const inp = barra.getElementById("ventrada");
    barra.getElementById("vens").classList.remove("hidden");
    barra.getElementById("vdica").classList.remove("hidden");
    inp.classList.remove("hidden");
    inp.focus();
    inp.select();
  }

  function fecharDigitado() {
    const inp = barra?.getElementById("ventrada");
    if (!inp) return;
    inp.value = "";
    inp.classList.add("hidden");
    barra.getElementById("vens").classList.add("hidden");
    barra.getElementById("vdica").classList.add("hidden");
    Barra.fechar();
  }

  function ligarTeclado() {
    const inp = barra.getElementById("ventrada");
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); fecharDigitado(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const frase = inp.value.trim();
        if (frase) Comando.processar(frase, "digitado");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        roteiroIdx = e.key === "ArrowDown"
          ? (roteiroIdx + 1) % ROTEIRO.length
          : (roteiroIdx - 1 + ROTEIRO.length) % ROTEIRO.length;
        inp.value = ROTEIRO[roteiroIdx];
        inp.select();
      }
    });
    // "D" com a barra em foco abre o modo digitado sem tirar a mão do teclado
    barra.addEventListener("keydown", (e) => {
      if (e.target === inp) return;
      if (e.key === "d" || e.key === "D") { e.preventDefault(); abrirDigitado(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) { e.preventDefault(); abrirDigitado(); }
    }, true);
  }

  // ---------- Comando: interpreta, aplica, e deixa desfazer ----------
  const IDS_ESTRUTURAIS = ["frase-curta", "passos-numerados", "sem-metafora", "glossario-jargao", "resumo-antes", "bloco-curto", "checklist-acao", "sem-parede-texto", "ancoras-navegacao"];

  /** A rota remota tem 4s. Se estourar, some, ou devolver lixo, seguimos com o palpite local. */
  async function pedirRemoto(frase) {
    if (!vivo()) return null;
    try {
      const corrida = Promise.race([
        chrome.runtime.sendMessage({ tipo: "COMANDO_REMOTO", frase }),
        new Promise((r) => setTimeout(() => r(null), 4500)),
      ]);
      const res = await corrida;
      if (!res?.ok || !res.cmd) return null;
      return res.cmd;
    } catch { return null; }
  }

  const Comando = {
    interpretarLocal,
    async processar(frase, origem) {
      frase = (frase || "").trim();
      if (!frase) return;
      Barra.abrir();
      Barra.estado("aplicando");
      Barra.parcial(frase);

      let cmd = interpretarLocal(frase);
      if (cmd.confianca < 0.6) {
        const remoto = await pedirRemoto(frase);
        if (remoto && (remoto.confianca ?? 0) > cmd.confianca) {
          cmd = { ligar: [], desligar: [], limites: {}, acoes: [], ...remoto, frase };
          if (!cmd.chips && cmd.eco) cmd.chips = String(cmd.eco).split(" · ");
        }
      }
      if (!cmd.confianca) { Barra.naoEntendi(frase); return; }

      Barra.estado("aplicando");
      Barra.parcial(frase);
      Barra.chips(cmd);
      await this.aplicar(cmd, origem);
    },

    async aplicar(cmd, origem) {
      const antes = Aparencia.instantaneo();
      const entraram = [];

      // 1. o que é pura aparência muda na hora, sem rede
      if (cmd.paleta) Aparencia.paleta(cmd.paleta);
      if (cmd.fonte?.passo) Aparencia.fonte(cmd.fonte.passo);
      if (cmd.destaques) Aparencia.destaques(cmd.destaques);

      const acoes = cmd.acoes ?? [];
      if (acoes.includes("reverter")) {
        reverter();
        Barra.desfazer(cmd.eco || "voltou ao original", 8000, () => rodar());
        return;
      }
      if (acoes.includes("exportar")) {
        avisar("Exportar é no painel", "Abra o painel lateral e clique em Exportar JSON — o arquivo vai para a sua pasta de downloads.");
      }

      // 2. o que é estrutura precisa do perfil e de uma nova adaptação
      const ligar = (cmd.ligar ?? []).filter((id) => IDS_ESTRUTURAIS.includes(id) || id === "paleta-calma");
      const desligar = cmd.desligar ?? [];
      const temLimites = cmd.limites && Object.keys(cmd.limites).length > 0;

      if (ligar.length || temLimites) {
        try {
          await chrome.runtime.sendMessage({ tipo: "APRENDER_VOZ", regras: ligar, frase: cmd.frase ?? "", limites: cmd.limites ?? {} });
          entraram.push(...ligar);
        } catch {}
      }
      for (const id of desligar) {
        try { await chrome.runtime.sendMessage({ tipo: "ALTERNAR", regra: id, ativa: false }); } catch {}
      }

      const precisaReadaptar = ligar.length || desligar.length || temLimites || acoes.includes("readaptar");
      if (precisaReadaptar) {
        await rodar();
        aplicarAparencia(); // o shadow foi refeito: devolve paleta, fonte e grifos escolhidos por voz
      }

      Barra.estado("ocioso");
      Barra.parcial("");
      Barra.desfazer(cmd.eco, 8000, async () => {
        Aparencia.restaurar(antes);
        for (const id of entraram) {
          try { await chrome.runtime.sendMessage({ tipo: "REJEITAR", regra: id }); } catch {}
        }
        if (entraram.length || temLimites) { await rodar(); aplicarAparencia(); }
        Barra.fechar();
      });
      void origem;
    },
  };

  // ---------- voz: Web Speech API, e só aqui no content script ----------
  // Em MV3 o microfone não existe no service worker, no popup nem no side panel.
  // Esta é a única camada da extensão que consegue ouvir — por isso o comando mora aqui.
  const Voz = {
    rec: null,
    ouvindo: false,
    ultimoStop: 0,
    watchdog: null,
    falaFinal: "",

    suportada() {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    async permitida() {
      try {
        const st = await navigator.permissions.query({ name: "microphone" });
        return st.state; // "granted" | "prompt" | "denied"
      } catch {
        return "prompt"; // navegador sem a query: tenta e trata o erro
      }
    },

    async alternar() {
      if (this.ouvindo) { this.parar(); return; }
      await this.comecar();
    },

    async comecar() {
      if (Date.now() - this.ultimoStop < 400) return; // trava anti-loop: nunca religar em rajada
      if (!this.suportada()) {
        Barra.semVoz("Este navegador não tem reconhecimento de voz. Digite o comando — funciona igual.");
        return;
      }
      const estado = await this.permitida();
      if (estado === "denied") {
        Barra.semVoz("O microfone está bloqueado nesta página. Clique no cadeado ao lado do endereço → Microfone → Permitir. Enquanto isso, digite.");
        return;
      }

      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Rec();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      this.rec = rec;
      this.falaFinal = "";

      rec.onstart = () => {
        this.ouvindo = true;
        Barra.abrir();
        Barra.estado("ouvindo");
        Barra.parcial("fale o que você quer mudar nesta leitura…");
        clearTimeout(this.watchdog);
        // 12s é o teto: sem isto, um onend que não chega deixa a barra vermelha para sempre
        this.watchdog = setTimeout(() => { try { rec.stop(); } catch {} }, 12000);
      };

      rec.onresult = (ev) => {
        let parcial = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) this.falaFinal += t + " ";
          else parcial += t;
        }
        Barra.parcial((this.falaFinal + parcial).trim());
      };

      rec.onerror = (ev) => {
        const e = ev?.error;
        this.ouvindo = false;
        clearTimeout(this.watchdog);
        if (e === "not-allowed" || e === "service-not-allowed") {
          Barra.semVoz("O navegador não liberou o microfone. Clique no cadeado ao lado do endereço → Microfone → Permitir. Por enquanto, digite o comando.");
          return;
        }
        if (e === "no-speech") { Barra.estado("ocioso"); Barra.parcial("não ouvi nada — toque no microfone e fale de novo"); return; }
        if (e === "aborted") { Barra.estado("ocioso"); return; }
        Barra.semVoz(`O reconhecimento falhou (${e ?? "erro"}). Digite o comando.`);
      };

      rec.onend = () => {
        this.ouvindo = false;
        this.ultimoStop = Date.now();
        clearTimeout(this.watchdog);
        const mic = barra?.getElementById("mic");
        if (mic) mic.classList.remove("on");
        const frase = this.falaFinal.trim();
        if (frase) Comando.processar(frase, "voz");
        else if (barra?.getElementById("voz")?.classList.contains("ouvindo")) Barra.estado("ocioso");
      };

      try { rec.start(); }
      catch { Barra.semVoz("Não consegui abrir o microfone agora. Digite o comando."); }
    },

    parar() {
      clearTimeout(this.watchdog);
      try { this.rec?.stop(); } catch {}
      this.ouvindo = false;
      this.ultimoStop = Date.now();
    },
  };


  chrome.runtime.onMessage.addListener((msg, _s, responder) => {
    if (msg?.tipo === "RODAR") { rodar(); responder({ ok: true }); }
    if (msg?.tipo === "REVERTER") { reverter(); responder({ ok: true }); }
    if (msg?.tipo === "OUVIR") { Voz.alternar(); responder({ ok: true }); }
    if (msg?.tipo === "DIGITAR") { abrirDigitado(); responder({ ok: true }); }
    return true;
  });

  montarBarra();
})();
