/**
 * Um comando falado vira ISTO — nunca texto livre aplicado na marra.
 * O léxico determinístico do cliente e o modelo produzem o mesmo formato, então a camada que aplica
 * não sabe (nem precisa saber) de onde veio: voz, digitado ou LLM.
 */
import { z } from "zod";

export const REGRAS = z.enum([
  "frase-curta", "passos-numerados", "sem-metafora", "glossario-jargao", "resumo-antes",
  "bloco-curto", "paleta-calma", "checklist-acao", "sem-parede-texto", "ancoras-navegacao",
]);

export const PALETAS = z.enum(["claro", "sepia", "alto-contraste", "escuro-suave", "original"]);

export const ComandoSchema = z.object({
  ligar: z.array(REGRAS),
  desligar: z.array(REGRAS),
  limites: z.object({
    palavrasPorFrase: z.number().int().min(6).max(40).nullable(),
    frasesPorBloco: z.number().int().min(1).max(12).nullable(),
  }),
  fonte: z.object({ passo: z.number().int().min(-3).max(3).nullable() }),
  paleta: PALETAS.nullable(),
  destaques: z.object({
    ligado: z.boolean().nullable(),
    cor: z.enum(["verde", "amarelo", "azul", "rosa", "cinza"]).nullable(),
  }),
  acoes: z.array(z.enum(["reverter", "readaptar", "exportar", "abrir-painel"])),
  /** 0 a 1. Abaixo de 0,6 a barra pergunta em vez de aplicar. */
  confianca: z.number().min(0).max(1),
  /** Texto curto do que foi entendido, mostrado como chips na barra. */
  eco: z.string(),
  /** O que sobrou sem mapeamento. Vai para a tela quando a confiança é baixa. */
  naoEntendido: z.string(),
});

export type Comando = z.infer<typeof ComandoSchema>;

export const COMANDO_VAZIO: Comando = {
  ligar: [], desligar: [], limites: { palavrasPorFrase: null, frasesPorBloco: null },
  fonte: { passo: null }, paleta: null, destaques: { ligado: null, cor: null },
  acoes: [], confianca: 0, eco: "", naoEntendido: "",
};

export const SISTEMA_COMANDO = [
  "Você converte um pedido falado, em português do Brasil, num comando de formatação de leitura.",
  "Regras:",
  "1. Use SOMENTE os identificadores de regra permitidos pelo schema. Nunca invente um id.",
  "2. Se a pessoa pede para tirar, remover ou desligar algo, o id vai em desligar, não em ligar.",
  "3. 'eco' é o que você entendeu, em até 6 palavras, para a pessoa conferir na tela. Ex.: 'Passos numerados + fundo escuro'.",
  "4. 'naoEntendido' recebe o trecho do pedido que você não conseguiu mapear. Deixe vazio se mapeou tudo.",
  "5. 'confianca' é honesta: 0.9+ quando o pedido é claro, 0.5 quando você chutou, 0.2 quando não faz ideia.",
  "6. Não invente ação que a pessoa não pediu. Comando vazio com confiança baixa é melhor que comando errado.",
  "Significado das regras: frase-curta (encurtar frases), passos-numerados (virar sequência numerada), sem-metafora (linguagem literal), glossario-jargao (explicar termos técnicos), resumo-antes (resumo no topo), bloco-curto (blocos menores), paleta-calma (cores suaves), checklist-acao (lista do que fazer), sem-parede-texto (quebrar prosa corrida), ancoras-navegacao (subtítulos para navegar).",
].join("\n");
