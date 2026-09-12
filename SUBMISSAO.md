# Entregáveis da submissão

## Título
**Leitura Minha — o copiloto que lê a página com você, no seu formato e com o contexto da sua empresa**

## Descrição

Todo copiloto de IA hoje mora numa sidebar e espera você perguntar. O problema é que você não sabe que deveria perguntar.

A Leitura Minha é uma extensão de Chrome que vive dentro do artigo que a pessoa já está lendo. Ela faz duas coisas que ninguém faz junto:

**1. Adapta a forma, e aprende com você.** O agente diagnostica a página com números — "frases com 50,4 palavras em média", "um bloco único de 205 palavras" — e propõe adaptações com essa evidência à vista. Cada aprovação sua sobe a confiança de uma regra; a partir de 0,7 ela passa a ser aplicada sozinha nas próximas páginas. O perfil é versionado, editável, exportável em JSON e mora no seu navegador. Ele é seu, não nosso.

**2. Ancora insights de negócio no parágrafo que os gerou.** Você preenche seu cargo, o que faz, as campanhas em andamento, os concorrentes que monitora, o posicionamento e — importante — o que sua empresa decidiu **não** fazer. O agente cruza o artigo com isso e acende as frases que importam, com um card embaixo: qual campanha aquilo afeta, qual concorrente já faz aquilo, e o que fazer nesta semana.

**A defesa contra alucinação é o núcleo técnico.** Todo insight precisa de uma âncora — um trecho literal do artigo. O servidor valida cada âncora contra o texto original e **descarta o que não casa**; a tela mostra quantos foram descartados. O modelo não consegue inventar uma citação e passar.

**Comando por voz.** A pessoa fala "adapta essa tela em passos numerados com fundo escuro" e a tela muda. Um léxico determinístico no cliente resolve os comandos comuns sem tocar a rede; só o que ele não entende sobe para o modelo. Comando falado entra no perfil com confiança 0,5 — porque erro de transcrição não pode virar regra permanente. Falar a mesma coisa duas vezes é o que faz a regra virar automática.

**Por que este contexto importa:** o profissional de marketing já lê 40 artigos por semana e arquiva 38 numa pasta que nunca reabre. O contexto da empresa dele existe — em onze documentos e na cabeça dele. O artigo existe, no navegador. Os dois nunca se encontram. Pesquisamos o mercado e a interseção entre "ancorar insight no conteúdo" e "usar contexto persistente da empresa" está literalmente vazia: os copilotos de navegador são sidebar reativa, as ferramentas de inteligência competitiva exigem captura manual e devolvem dias depois, e Jasper, Writer e HubSpot têm o contexto mas só o usam na escrita, nunca na leitura.

**Stack:** extensão Chrome MV3 (JS puro, Shadow DOM) + Next.js 16. OpenRouter com saída estruturada via zod para adaptação, insights e interpretação de comando; rota de voz por `input_audio` em modelo multimodal. Motor determinístico de diagnóstico e adaptação em TypeScript que funciona **sem LLM nenhum** — mesma entrada e mesmo perfil produzem exatamente a mesma saída, e a demo nunca cai.

## Repositório
https://github.com/Durannd/leitura-minha

## Post para rede social

> A maioria dos agentes de IA mora numa janela de chat e espera você perguntar.
>
> O problema: você não sabe que deveria perguntar.
>
> Construímos a Leitura Minha no @aitinkerers "Agents, Everywhere" (São Paulo, @FaculdadeImpacta): uma extensão de Chrome que lê o artigo junto com você.
>
> Ela adapta o texto ao seu jeito de ler — e aprende com cada aprovação sua, num perfil que é seu e que você exporta quando quiser.
>
> E cruza cada trecho com o contexto da sua empresa: campanhas rodando, concorrentes monitorados, o que vocês decidiram não fazer. O insight não fica numa sidebar. Ele acende no parágrafo que o gerou.
>
> Todo insight precisa de uma citação literal do artigo. O que não casa com o texto original é descartado antes de chegar na sua tela — e a gente mostra quantos foram.
>
> Você também pode só falar: "adapta essa tela em passos numerados com fundo escuro".
>
> Feito com @OpenRouterAI (saída estruturada + áudio multimodal) e Next.js.
>
> Código aberto: github.com/Durannd/leitura-minha
>
> #AgentsEverywhere #AITinkerers #OpenAI

## Roteiro do vídeo (2 minutos)

**0:00–0:15 — o problema, na tela**
Artigo real de mercado aberto, parede de texto. "Eu leio 40 artigos por semana. Arquivo 38 numa pasta que nunca reabro. E três semanas depois, numa reunião, descubro que a resposta estava no parágrafo nove."

**0:15–0:35 — adaptação + diagnóstico**
Clique em "Adaptar para mim". Mostra "O que eu vi nesta página" com os números reais. O artigo se reorganiza. Diga: "ele não resumiu — cobriu o texto inteiro, na mesma ordem, no mesmo idioma. Só mudou a forma."

**0:35–1:05 — O MOMENTO MÁGICO: os insights acendendo**
Três frases acendem em cores diferentes, numeradas, com os cards subindo embaixo de cada uma. Leia um em voz alta: *"o artigo diz que vídeo curto converte melhor; sua campanha Ruptura Zero só roda texto e está 55% acima da meta de CPL."* Aponte o contador: **"3 insights, 2 descartados — esses dois citavam trechos que não existem no artigo. A gente não deixa passar."**

**1:05–1:25 — o contexto é seu**
Abra o painel, aba "Meu contexto". Mostre os campos preenchidos, especialmente **"O que vocês NÃO fazem"**. "É isto que separa isso de um chatbot: ele sabe que a gente não faz trial gratuito, então ele não sugere trial gratuito."

**1:25–1:45 — voz**
Fale: *"deixa as frases bem curtas e destaca os termos técnicos."* A tela muda. Fale de novo a mesma coisa. Abra o painel: a regra saltou de "testando" para **"automático"**. "Ele aprendeu. Na próxima página, já vem assim."

**1:45–2:00 — fechamento**
Painel com as regras e a barra de confiança, e o botão Exportar. "O perfil é da pessoa, não nosso. Sai daqui num JSON." Corte.
