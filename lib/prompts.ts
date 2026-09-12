/** Instruções do adaptador. O LLM NÃO decide a forma — as regras decidem. Ele só reescreve dentro da forma pedida. */
import type { Regra } from "./perfil/tipos";

export const SISTEMA_ADAPTADOR = [
  "Você reescreve conteúdo para uma pessoa específica, seguindo regras de forma que ela mesma aprovou.",
  "Regras invioláveis:",
  "1. NUNCA invente fato, número ou nome que não esteja no texto original. Adaptar é mudar a forma, não o conteúdo.",
  "2. Se uma informação existe no original, ela precisa continuar existindo na adaptação.",
  "3. Não infira diagnóstico, condição ou deficiência da pessoa. Você só conhece as preferências listadas.",
  "4. Não seja condescendente. Texto simples não é texto infantil.",
  "5. Escreva NO MESMO IDIOMA do texto original. Se o artigo está em inglês, a adaptação sai em inglês. Adaptar não é traduzir.",
  "6. Cubra o texto inteiro, do começo ao fim. Nunca pare no meio nem resuma o final em uma frase: se o espaço apertar, encurte as frases, não corte assuntos.",
  "7. Mantenha a ordem das ideias do original. A pessoa pode querer conferir contra a página.",
  "8. Não adicione conclusão, opinião ou chamada para ação que o original não tenha.",
].join("\n");

export function instrucaoDasRegras(regras: Regra[], limites: { palavrasPorFrase: number; frasesPorBloco: number }): string {
  if (regras.length === 0) {
    return "Nenhuma preferência registrada ainda. Preserve a estrutura e o conteúdo do original; apenas quebre parágrafos com mais de 5 frases e dê a cada bloco um subtítulo curto quando houver mudança clara de assunto.";
  }
  const mapa: Record<string, string> = {
    "frase-curta": `Nenhuma frase passa de ${limites.palavrasPorFrase} palavras. Quebre frases longas em duas.`,
    "passos-numerados": "Quando o texto descreve um processo, uma ordem ou uma sequência, transforme em blocos do tipo passo, numerados.",
    "sem-metafora": "Substitua metáfora, ironia e figura de linguagem pelo sentido literal. Se o original diz 'a economia derreteu', escreva 'a economia caiu muito'.",
    "glossario-jargao": "Identifique termos técnicos, siglas e jargão. Para cada um, devolva uma definição de no máximo 15 palavras no glossario.",
    "resumo-antes": "Comece com um bloco do tipo resumo: 3 frases dizendo do que trata e por que importa.",
    "bloco-curto": `Nenhum bloco passa de ${limites.frasesPorBloco} frases.`,
    "checklist-acao": "Se o texto pede alguma ação do leitor, extraia um bloco do tipo checklist com o que ele precisa fazer.",
    "sem-parede-texto": "Quebre qualquer sequência longa de prosa corrida usando subtítulos curtos.",
    "ancoras-navegacao": "Dê a cada bloco um titulo curto de no máximo 5 palavras, para servir de âncora.",
    "paleta-calma": "",
  };
  const linhas = regras.map((r) => mapa[r.id]).filter(Boolean);
  return [
    "Preferências desta pessoa (ela mesma aprovou cada uma):",
    ...linhas.map((l) => `- ${l}`),
    "",
    "Estas preferências mudam a FORMA. Nenhuma delas autoriza remover informação do original.",
  ].join("\n");
}
