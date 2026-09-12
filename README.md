# Leitura Minha

**Um leitor que aprende com você.** Extensão de Chrome que adapta qualquer página ao seu jeito de ler — e guarda o que aprendeu num perfil que é seu, fica no seu navegador e você exporta quando quiser.

> Nenhuma das ferramentas de leitura existentes aprende com o usuário. Immersive Reader, Read&Write (14M usuários), Speechify, BeeLine, Helperbird: todas são painel de preferências estático ou geração one-shot sem memória. Ver [PESQUISA-MERCADO.md](./PESQUISA-MERCADO.md).

---

## Como funciona

```
página real  →  content script extrai o artigo
                        ↓
         service worker (dono do perfil, única porta para a rede)
                        ↓
         POST /api/adapt  { texto, titulo, url, perfil }
                        ↓
   ┌────────────────────────────────────────────────┐
   │ 1. diagnosticar(texto)  — determinístico        │  ← o agente OLHA a página e acha o que dói,
   │    "frases com 50.4 palavras em média"          │    com evidência numérica, antes de perguntar
   │ 2. regras do perfil decidem a FORMA             │  ← confiança ≥ 0.7 aplica sozinho
   │ 3. LLM preenche o CONTEÚDO dentro da forma      │  ← OpenRouter, saída estruturada (zod)
   │    (falhou? motor determinístico assume)        │  ← a demo nunca cai
   └────────────────────────────────────────────────┘
                        ↓
         JSON estruturado (blocos, glossário, métricas, diagnóstico)
                        ↓
   content script re-renderiza no lugar (Shadow DOM, original só escondido)
                        ↓
         card de aprovação  →  confiança sobe  →  próxima página já vem adaptada
```

**O que não é um prompt:** a confiança sobe +0.25 por aprovação e cai −0.40 por rejeição, em `lib/perfil/aprendizado.ts`. Mesma sequência de eventos produz exatamente o mesmo perfil. O LLM não participa dessa decisão.

---

## Rodar

```bash
npm install                      # já há node_modules linkado se você copiou do hacka-12
cp .env.example .env.local       # preencha OPENROUTER_API_KEY
npm run dev                      # sobe na porta 3010 (a extensão aponta para ela)
```

Sem chave de modelo a aplicação **continua funcionando**: o motor determinístico adapta sozinho, e o selo na página mostra "modo local".

### Carregar a extensão

1. `chrome://extensions` → ligue **Modo do desenvolvedor** (canto superior direito)
2. **Carregar sem compactação** → selecione a pasta `extension/`
3. Fixe o ícone na barra (ícone de quebra-cabeça → alfinete)

### Testar

1. Abra <http://localhost:3010/demo/plano-de-saude> — é uma parede de texto real: 403 palavras, frases de 50 palavras em média, um bloco único de 205 palavras.
2. **F5** (o content script precisa estar injetado).
3. Clique em **"Adaptar para mim"**, embaixo à direita.
4. A página é substituída pela versão adaptada. No topo dela: *o que eu vi nesta página*, com os números que motivaram cada mudança. No rodapé: `frase média 50.4 → 7.7 palavras`.
5. Aparece o card: **"Fixar 'Frases curtas'?"** → clique em **Sim, aprenda isso**. Repita para as outras sugestões.
6. Clique no ícone da extensão → o **painel lateral** abre com as regras, a barra de confiança e o horário em que cada uma foi aprendida.
7. Aprove a mesma regra em **3 páginas** (a confiança passa de 0.7) → ela vira **automático**.
8. Abra <http://localhost:3010/demo/edital> → **F5** → clique em Adaptar. Ela já chega adaptada **sem perguntar nada**. Esse é o ponto.
9. **Exportar JSON** no painel: o perfil sai num arquivo que é da pessoa.
10. **Ver original** reverte a qualquer momento — o original nunca foi destruído, só escondido.

### Onde ver os logs (são três consoles diferentes)

| O quê | Onde |
|---|---|
| `content.js` | F12 na própria página → no seletor de contexto do console, escolha `Leitura Minha` |
| `background.js` | `chrome://extensions` → card da extensão → link **"service worker"** |
| `painel.js` | botão direito dentro do painel lateral → Inspecionar |

A requisição para `/api/adapt` aparece na aba Network **do DevTools do service worker**, não da página.

---

## Estrutura

```
lib/perfil/tipos.ts          catálogo de regras, formato do perfil, LIMIAR_AUTO
lib/perfil/aprendizado.ts    aprovar / rejeitar / alternar — determinístico, sem LLM
lib/rules/adaptar.ts         diagnosticar(), métricas, e o adaptador sem LLM (fallback)
lib/prompts.ts               instrução do adaptador; regras viram instrução, não o contrário
app/api/adapt/route.ts       a rota, com CORS para a extensão e saída estruturada
app/demo/*                   duas paredes de texto reais para a demo
extension/                   MV3, JS puro, sem bundler
```

---

## Decisões de projeto

- **A chave do modelo nunca toca o cliente.** Extensão é 100% inspecionável; só o service worker fala com o backend, e só o backend fala com a OpenRouter.
- **O perfil mora em `chrome.storage.local`.** Não sobe para servidor nenhum. É o oposto do modelo de overlay, que serve ao dono do site.
- **O original é escondido, não destruído.** `display:none` no nó + versão adaptada como irmão. Reverter é garantido e não perde listeners da página.
- **Shadow DOM em tudo que injetamos**, com `all:initial` no host — o CSS da página não vaza para dentro nem o nosso para fora, e o CSP do site não bloqueia porque nada é `<script src>` injetado.
- **Lista de nunca-tocar**: banco, e-mail, checkout e páginas de login não são enviados ao backend. Está em `extension/background.js`.
- **O agente nunca infere diagnóstico.** Ele registra preferências declaradas e evidências medidas na página. Nada no código deduz TEA, TDAH ou dislexia de ninguém.

---

## Limites conhecidos

- A extração de artigo é heurística: falha em SPAs que renderizam tarde, paywalls, dashboards e PDFs. Nesses casos avisa em vez de adaptar errado.
- O LLM pode agrupar passos que deveriam ficar separados. A instrução proíbe adicionar fato ausente do original, mas isso não é verificado automaticamente — é a próxima coisa a construir.
- `chrome.storage.local` não sincroniza entre máquinas. O botão Exportar existe por isso.
