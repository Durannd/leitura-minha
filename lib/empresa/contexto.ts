/**
 * O contexto da empresa é o segundo artefato do produto (o primeiro é o perfil de leitura).
 * Também é editável, versionado e do cliente. É ele que transforma "resumir artigo" em "isto afeta a sua campanha".
 */

export type Campanha = {
  id: string;
  nome: string;
  status: "ativa" | "planejada" | "encerrada";
  canal: string;
  publico: string;
  /** A promessa central. O agente usa isto para detectar contradição entre o que a pessoa lê e o que a empresa promete. */
  mensagem: string;
  metrica: string;
  /** Onde está doendo. É o gancho mais forte para insight acionável. */
  problema?: string;
};

export type Concorrente = {
  nome: string;
  posicionamento: string;
  /** Movimentos conhecidos. O agente cruza o artigo com isto para dizer "o X já faz isso". */
  movimentos: string[];
};

export type ContextoEmpresa = {
  versao: number;
  atualizadoEm: string;
  empresa: string;
  oQueVende: string;
  icp: string;
  posicionamento: string;
  /** Tom de voz da marca: o agente aponta quando o artigo sugere algo que quebra isto. */
  tomDeVoz: string;
  campanhas: Campanha[];
  concorrentes: Concorrente[];
  /** Coisas que a empresa decidiu NÃO fazer. Evita insight que sugere o que já foi descartado. */
  restricoes: string[];
};

/** Seed da demo: uma empresa concreta o bastante para os insights terem consequência. */
export const CONTEXTO_DEMO: ContextoEmpresa = {
  versao: 7,
  atualizadoEm: "2026-09-10T09:00:00Z",
  empresa: "Fluxo",
  oQueVende: "Software de gestão de estoque para redes de farmácia de médio porte (8 a 60 lojas), assinatura mensal por loja.",
  icp: "Diretor de operações ou sócio-proprietário de rede regional de farmácias no Brasil, 8 a 60 lojas, que ainda controla estoque por planilha ou por ERP genérico.",
  posicionamento: "O ERP genérico trata remédio como mercadoria. A Fluxo entende validade, lote, rastreabilidade ANVISA e ruptura de item controlado.",
  tomDeVoz: "Direto e técnico. Fala com quem opera, não com quem investe. Sem promessa de transformação digital, sem jargão de consultoria.",
  campanhas: [
    {
      id: "c1",
      nome: "Ruptura Zero",
      status: "ativa",
      canal: "LinkedIn Ads + e-mail para base fria",
      publico: "Diretor de operações de rede com 15+ lojas",
      mensagem: "Você perde mais dinheiro com item em falta do que com item vencido.",
      metrica: "CPL R$ 340, meta R$ 220",
      problema: "O CPL está 55% acima da meta há três semanas e a taxa de resposta do e-mail caiu de 4,1% para 1,8%.",
    },
    {
      id: "c2",
      nome: "Troca de ERP",
      status: "ativa",
      canal: "Conteúdo orgânico + SEO",
      publico: "Quem já tem ERP genérico e sente a dor da validade",
      mensagem: "Trocar de ERP dói menos do que perder um lote inteiro por vencimento.",
      metrica: "12 leads orgânicos/mês, meta 30",
      problema: "O conteúdo ranqueia, mas converte pouco: tempo na página alto e clique no CTA baixo.",
    },
    {
      id: "c3",
      nome: "Indicação de balconista",
      status: "planejada",
      canal: "Programa de indicação",
      publico: "Balconistas e farmacêuticos das redes clientes",
      mensagem: "Quem usa todo dia sabe quem precisa.",
      metrica: "—",
    },
  ],
  concorrentes: [
    {
      nome: "Trinks ERP",
      posicionamento: "ERP genérico de varejo que atende farmácia como um vertical entre outros.",
      movimentos: [
        "Lançou em julho/2026 uma calculadora de ruptura gratuita como isca de lead",
        "Investe pesado em anúncio de busca para 'sistema para farmácia'",
        "Publica case de cliente toda semana no LinkedIn com número de economia",
      ],
    },
    {
      nome: "Estoque Vivo",
      posicionamento: "Concorrente direto, mesma vertical, preço 30% menor e produto mais raso.",
      movimentos: [
        "Fez uma série de webinars com conselhos regionais de farmácia",
        "Ataca a Fluxo por preço em comparativo público no site",
        "Contratou dois vendedores que saíram da Fluxo em 2026",
      ],
    },
  ],
  restricoes: [
    "Não fazemos trial gratuito: a implantação exige integração e um trial ruim queima o lead.",
    "Não vendemos para farmácia independente de 1 a 3 lojas — o ticket não paga o suporte.",
    "Não usamos influenciador de negócios; o público desconfia.",
  ],
};
