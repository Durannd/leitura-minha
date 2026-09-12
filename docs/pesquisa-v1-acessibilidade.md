# Leitura Minha — pesquisa de mercado e narrativa

> Documento de apoio à submissão. Pesquisa feita em 12/09/2026.
> Todo número tem fonte. O que não foi possível confirmar está marcado **[NÃO VERIFICADO]** — não use esses no pitch.

---

## 1. O problema, em quatro números

| Dado | Valor | Fonte |
|---|---|---|
| Home pages com falhas WCAG detectáveis | **95,9%** em 2026 — *piorou*, revertendo 6 anos de melhora (94,8% em 2025). Complexidade média da página subiu 22,5% em um ano | [WebAIM Million](https://webaim.org/projects/million/) |
| Adultos com TDAH nos EUA | **6,0% ≈ 15,5 milhões** com diagnóstico atual (~1 em 16) | [CDC MMWR 73/40, out/2024](https://www.cdc.gov/mmwr/volumes/73/wr/pdfs/mm7340a1-H.pdf) |
| Prevalência de TEA | **1 em 31 crianças de 8 anos (3,2%)** — era 1 em 36 em 2020 e 1 em 44 em 2018 | [CDC MMWR SS 74/SS-2, abr/2025](https://www.cdc.gov/mmwr/volumes/74/ss/ss7402a1.htm) |
| Dislexia | **5% a 17%** da população dos EUA (IDA); Yale estima ~20% com traços disléxicos | [dyslexiaida.org](https://dyslexiaida.org) · [dyslexia.yale.edu](https://www.dyslexia.yale.edu) |

**O ponto normativo que sustenta tudo:** o próprio W3C reconhece que **WCAG 2.x não cobre o espectro cognitivo de forma normativa**. O guia do COGA Task Force, "Making Content Usable", é uma *Working Group Note informativa* — seguir não conta para conformidade. O mercado seguiu a norma e otimizou para deficiência sensorial. Acessibilidade cognitiva é o mercado que a regulação esqueceu.
[W3C COGA](https://www.w3.org/WAI/cognitive/) · [Making Content Usable](https://www.w3.org/TR/coga-usable/introduction.html)

Vento regulatório: o **European Accessibility Act** é exigível desde **28/06/2025** para produtos e serviços novos, com transição até 28/06/2030 (Diretiva 2019/882, exige WCAG 2.1 AA / EN 301 549). **[Data confirmada em fontes secundárias; link oficial NÃO VERIFICADO]**

---

## 2. Concorrência — e a lacuna

| Produto | O que faz | LLM generativo? | Aprende com o usuário? | Usuários (Chrome Web Store) |
|---|---|---|---|---|
| **Read&Write** (Texthelp/Everway) | TTS, previsão de palavras, remoção de distratores | Não | **Não** | **14.000.000** |
| **Speechify** | TTS premium + AI Summaries | **Sim** | **Não** | 1.000.000 |
| **Helperbird** | Fontes, espaçamento, overlays de cor, ditado | Parcial **[NÃO VERIFICADO]** | **Não** | 400.000 |
| **BeeLine Reader** | Gradiente de cor por linha | Não | **Não** | 30.000 |
| **Microsoft Immersive Reader** | Isola conteúdo, TTS, sílabas, dicionário visual | Não | **Não** | 10.000 (ext. não-oficial) |
| **NaturalReader** | TTS para texto, PDF, OCR | Não confirmado | **Não** | ~800.000 **[NÃO VERIFICADO]** |
| **Reader Mode nativo** (Chrome/Edge/Safari) | Remove clutter, ajusta fonte | Não | **Não** | — |
| **Dyslexia Reader** *(entrante 2026)* | Overlay de foco, sílabas, "Simplify with AI" | **Sim** | **Não** — declara não coletar dados do usuário | 9.000 |
| **CogniRead** *(entrante 2026)* | Focus Mode, TL;DR, ELI5, figurado→literal, via APIs on-device do Chrome | **Sim** | **Não** — processa por sessão | **13** |

### As cinco coisas que ninguém faz

1. **Ninguém aprende.** Zero produtos ajustam comportamento a partir de aprovações e rejeições do usuário. Os que usam LLM fazem geração *one-shot sem memória*. Todo o resto é painel de preferências estático.
2. **Ninguém tem perfil versionado e exportável que pertença à pessoa.** O perfil de leitura de alguém não sai do Speechify para o Read&Write, não é herdado por uma escola, não é auditável pelo próprio usuário. Lock-in por omissão.
3. **Ninguém reestrutura — só reformata ou resume.** BeeLine colore, Immersive Reader isola, Read&Write lê em voz alta, Speechify resume. Quebrar em passos executáveis, impor limite de comprimento de frase, injetar glossário *in situ* e derivar checklist acionável é reestruturação semântica. Ninguém executa.
4. **Ninguém trata acessibilidade cognitiva como primeira classe.** WCAG não obriga, então o mercado não entrega.
5. **Ninguém opera do lado do usuário com autonomia.** Overlay só existe se o *site* pagou. Extensão inverte a dependência: funciona nas 95,9% de páginas quebradas sem pedir licença a ninguém.

### O tamanho dos entrantes com IA é a prova da janela aberta
Nenhuma extensão com **mais de 100 mil usuários** lançada em 2025/2026 usa LLM generativo para acessibilidade cognitiva. Os que usam têm **13** e **9.000** usuários.

---

## 3. Overlays: por que somos o oposto, não uma variação

Esta seção existe para uma pergunta específica do jurado: *"isso não é um overlay de acessibilidade?"*

- **FTC × accessiBe — US$ 1.000.000.** Complaint em 03/01/2025, ordem final aprovada em 22/04/2025. A empresa alegava que "instalar a única linha de código do accessWidget torna um site compatível com 30% dos requisitos WCAG imediatamente e inicia um processo de IA que o torna totalmente compatível com os 70% restantes em 48 horas". A FTC contestou: o widget falhava em tornar acessíveis menus, títulos, tabelas, imagens e gravações. Também houve acusação de **reviews pagos disfarçados de opinião independente**.
  [Press release](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites) · [Ordem final](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million) · [Complaint PDF](https://www.ftc.gov/system/files/ftc_gov/pdf/2223156accessibeaapc.pdf)
  > Samuel Levine, diretor do Bureau of Consumer Protection: *"Overstating a product's AI or other capabilities without adequate evidence is deceptive, and the FTC will act to stop it."*

- **Overlay instalado não impede processo — atrai.** No 1º semestre de 2025, **22,6% dos processos (456 de 2.019)** miravam sites que **já tinham** um overlay. Em 2024, **25% (1.023 casos)** citaram widgets de acessibilidade **como barreira, não como solução**. Volume total: 4.630 processos em 2023, 4.187 em 2024, projeção de **>4.975 em 2025**.
  [UsableNet 2025 Mid-Year](https://blog.usablenet.com/2025-midyear-accessibility-lawsuit-report-key-legal-trends) · [accessibility.works](https://www.accessibility.works/blog/ada-lawsuit-trends-statistics-2024-summary/)

- **UserWay** enfrenta class action (Distrito de Delaware, desde jul/2024): o widget não entregou a conformidade prometida. Em fev/2026 um magistrado federal recomendou que partes centrais do caso avancem. [Lainey Feingold](https://www.lflegal.com/2025/02/userway-overlay-lawsuit/)

- **Overlay Fact Sheet:** mais de **800 signatários**, incluindo editores das specs WCAG/ARIA/HTML e profissionais de Google, Microsoft, Apple, Shopify, BBC. [overlayfactsheet.com](https://overlayfactsheet.com/en/)

**A resposta de uma frase:** *overlay modifica o site em nome do dono e alega conformidade; nós adaptamos a leitura em nome da pessoa, no cliente dela, sem prometer conformidade a ninguém.* É a posição oposta na mesa — e é por isso que a multa da FTC é argumento a nosso favor, não contra.

---

## 4. TAM / SAM / SOM

O número top-down do setor — software de acessibilidade digital, **US$ 850M em 2025**, CAGR ~9,3% ([Fortune Business Insights](https://www.fortunebusinessinsights.com/digital-accessibility-software-market-111207); Precedence estima US$ 878M e CAGR 10,25%) — **não serve como TAM**: ele mede venda de *conformidade para donos de site*. Nosso comprador é outro. Por isso, bottom-up:

| | Conta | Valor |
|---|---|---|
| **TAM** global | ~1,5 bi de adultos online em mercados com pagamento por cartão × **10%** com dificuldade de leitura persistente (TDAH 6% + dislexia 5–17% + TEA 3,2%, com sobreposição) = **150M pessoas** × **US$ 30/ano** (âncoras: Helperbird ~US$30/ano, BeeLine ~US$24/ano) | **≈ US$ 4,5 bi/ano** |
| **SAM** (3 anos: PT-BR + ES, Chrome, consumidor + institucional) | **Consumidor:** ~180M adultos online BR/LatAm × 10% = 18M × **5% com capacidade de pagar** = 900k × R$ 180/ano ≈ R$ 162M. **Institucional:** ~2.500 IES brasileiras + RH corporativo a ~R$ 25/assento/ano (âncora: Read&Write ~US$17/licença) | **≈ US$ 60–90M/ano** |
| **SOM** (12–18 meses) | Comparáveis reais na Chrome Web Store: Dyslexia Reader 9k, BeeLine 30k. Meta: **25.000 instalações**, conversão **4%** = 1.000 pagantes × R$ 180 = R$ 180k, + **5 contratos institucionais** × R$ 40k = R$ 200k | **≈ R$ 380k/ano (US$ 70k)** |

**Três honestidades que dizemos antes de perguntarem:**
- O 10% de prevalência é otimista como base de TAM. Ter dislexia não significa pagar por software — por isso o SAM aplica 5% de capacidade de pagamento, não a prevalência bruta.
- **O caminho de receita é B2B2C, não assinatura individual.** Quem paga é a universidade, o RH, a operadora que manda o comunicado. O produto é do usuário; a fatura é institucional.
- **Rodadas 2025/2026 no setor: quase nada encontrado.** Eye-Able (DE) €20M e Tiimo US$1,6M, ambos com ano **[NÃO VERIFICADO]**. Não use no pitch.

---

## 5. Narrativa

### 5.1 A história (60 segundos, 1ª pessoa)

> Meu nome é Daniel, tenho 34 anos, sou técnico de refrigeração em Campinas. Na segunda-feira o RH mandou um link: "atualização do plano de saúde, prazo de adesão em 5 dias úteis".
>
> Abri. Onze parágrafos. Uma frase do terceiro tinha quatro linhas e três vírgulas. Palavras como "carência", "coparticipação", "beneficiário titular". Li a primeira vez e cheguei ao fim sem ter guardado nada. Li a segunda vez e comecei de novo no meio, porque perdi onde estava. Na terceira eu não estava mais lendo, estava só passando os olhos e fingindo, do jeito que faço desde os nove anos.
>
> Eu sei consertar um compressor ouvindo o barulho dele. Eu sei onde está o vazamento antes de abrir o equipamento. Mas eu não sei qual é a data do prazo, porque a data está dentro de uma frase que eu não consigo atravessar.
>
> Fechei a aba. Disse a mim mesmo que resolvia depois. Depois virou quinta-feira. Quinta virou o prazo vencido.
>
> Não é que eu não entenda. É que o texto foi escrito para outra pessoa, e ninguém nunca me perguntou como eu preciso que ele seja.

### 5.2 Antes e depois (slide)

> **ANTES:** 11 parágrafos · frases de 4 linhas · 3 jargões não explicados · prazo escondido no meio
>
> **DEPOIS:** 4 passos numerados · frases de até 12 palavras · glossário embutido · prazo no topo
>
> **ANTES:** Daniel fecha a aba e perde o prazo.
>
> **DEPOIS:** Daniel termina em 90 segundos — e o leitor aprende que ele prefere assim.

**Medido no protótipo, no texto real do comunicado:**
`50,4 → 7,7` palavras por frase · `205 → 18` palavras no maior bloco · facilidade de leitura `-14,3 → 51,1`.
Sem LLM, só com o motor determinístico: `50,4 → 15,5` palavras por frase.

### 5.3 Frases de impacto (vídeo e post)

1. **"A web não está quebrada para quem não enxerga. Está quebrada para quem não consegue atravessar a frase."**
2. **"Overlays consertam o site para o dono do site. Nós consertamos a leitura para a pessoa — e o perfil vai embora com ela."**
3. **"Ninguém no mercado aprende com você. Toda ferramenta de leitura te trata como um usuário novo, todo dia, para sempre."**

### 5.4 O momento mágico da demo

Não é a primeira adaptação — qualquer um faz isso com um prompt. É a **segunda página**: você cola uma URL diferente, e ela **já chega adaptada, sem perguntar nada**, porque o perfil aprendeu. O painel lateral mostra a regra que entrou, com a confiança que subiu e o horário em que isso aconteceu.

---

## 6. O que responder quando o jurado perguntar

| Pergunta | Resposta |
|---|---|
| *"Isso não é um overlay?"* | Overlay modifica o site em nome do dono e alega conformidade — foi o que a FTC multou em US$1M. Aqui a pessoa é a operadora, a adaptação é no cliente dela, nenhuma alegação WCAG é feita, e o perfil é exportável e apagável. |
| *"O Immersive Reader não faz isso de graça?"* | O Immersive Reader aplica o mesmo preset para todo mundo e não sabe que *você* trava em metáfora. Ele não aprende. Nenhum concorrente aprende. |
| *"Vocês estão tratando TEA e TDAH como a mesma coisa?"* | Não. O agente **nunca infere diagnóstico** — só registra preferências declaradas pela pessoa ("frases longas me perdem"), sempre com toggle, sempre reversível, sempre visível na tela. |
| *"E se o LLM inventar conteúdo?"* | Duas defesas: a instrução proíbe explicitamente adicionar fato, número ou nome ausente do original; e existe um motor determinístico que adapta **sem LLM nenhum** — mesma entrada e mesmo perfil produzem exatamente a mesma saída. |
| *"Qualquer integrador faz isso com um prompt."* | Um prompt adapta *uma* página. O perfil versionado, com confiança que sobe por aprovação e cai por rejeição, exportável em JSON e pertencente à pessoa, não é um prompt — é um artefato. |

---

## Fontes

CDC ADDM 2022 (pub. abr/2025) · CDC MMWR 73/40 (out/2024) · WebAIM Million 2025 e 2026 · W3C COGA / Making Content Usable · FTC v. accessiBe (docket 2223156) · UsableNet 2025 Mid-Year Report · Overlay Fact Sheet · Fortune Business Insights e Precedence Research (mercado) · Chrome Web Store (contagem de usuários, consultada em 12/09/2026).
