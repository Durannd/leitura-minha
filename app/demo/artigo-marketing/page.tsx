const TEXTO = `Ao longo de 2026, uma mudança silenciosa reorganizou a geração de demanda no B2B brasileiro: as ferramentas gratuitas passaram a superar o e-book como principal isca de captura de lead qualificado. O levantamento que circulou entre agências de performance no primeiro semestre indica que calculadoras, diagnósticos e simuladores geram leads com taxa de conversão para oportunidade três vezes maior do que materiais ricos tradicionais, ainda que o volume bruto de cadastros seja menor.

A explicação é menos sobre tecnologia e mais sobre o momento da intenção. Quem baixa um e-book está pesquisando. Quem usa uma calculadora está medindo um problema que já tem, e ao medir esse problema entrega ao fornecedor exatamente o número que o time comercial precisa para construir a proposta. O lead chega com a dor quantificada, e a conversa de vendas começa no meio, não no começo.

O efeito colateral apareceu rápido. Em categorias onde dois ou três fornecedores lançaram ferramentas parecidas no mesmo trimestre, o custo por lead dos anúncios de texto subiu entre 40% e 60%, porque o anúncio passou a competir com uma oferta que entrega valor antes do cadastro. Agências relatam que campanhas que dependiam exclusivamente de anúncio em rede social profissional, com criativo estático e formulário nativo, perderam eficiência de forma abrupta, sem que nada tivesse mudado na segmentação.

O segundo movimento é o formato. Anúncios em vídeo curto vertical, com depoimento de operador em vez de executivo, apresentaram custo por lead consistentemente menor do que peças estáticas nas mesmas campanhas e no mesmo público. O padrão se repetiu inclusive em segmentos considerados conservadores, como saúde, logística e varejo alimentar, onde a hipótese predominante era de que o público não consumiria vídeo em contexto profissional.

Há um risco pouco discutido. Ferramenta gratuita que não resolve nada além de gerar um número vira ruído e queima a marca com o público mais qualificado, justamente aquele que já sabe calcular sozinho. Empresas que lançaram calculadoras rasas viram a taxa de resposta de e-mail cair nos meses seguintes, num efeito de contaminação que atingiu também as campanhas que não tinham relação com a ferramenta.

Por fim, o canal de indicação voltou ao centro do debate. Programas estruturados de indicação operados por usuários finais, e não por compradores, apresentaram o menor custo de aquisição entre todos os canais medidos, com ciclo de venda mais curto e taxa de retenção superior no primeiro ano. A ressalva é operacional: exigem um sistema de atribuição e recompensa que a maior parte das empresas não tem montado.`;

export default function Page() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "56px 24px", fontFamily: "Georgia, serif", background: "#fff", color: "#16181c" }}>
      <p style={{ fontFamily: "system-ui", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#9aa0a8", margin: 0 }}>
        Demanda B2B · análise
      </p>
      <h1 style={{ fontFamily: "system-ui", fontSize: 32, lineHeight: 1.2, margin: "10px 0 6px" }}>
        A ferramenta gratuita virou a nova isca de lead — e encareceu o anúncio de todo mundo
      </h1>
      <p style={{ fontFamily: "system-ui", fontSize: 13.5, color: "#888", margin: "0 0 36px" }}>
        12 de setembro de 2026 · 7 min de leitura
      </p>
      <article>
        {TEXTO.split("\n\n").map((p, i) => (
          <p key={i} style={{ fontSize: 18, lineHeight: 1.78, margin: "0 0 24px" }}>{p}</p>
        ))}
      </article>
    </main>
  );
}
