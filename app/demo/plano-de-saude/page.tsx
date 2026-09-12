const TEXTO = `A partir do primeiro dia útil do mês subsequente à publicação deste comunicado, todos os beneficiários titulares vinculados ao plano coletivo empresarial administrado por esta operadora deverão, obrigatoriamente, proceder à confirmação de adesão ao novo produto contratado, sob pena de migração automática para a modalidade de coparticipação integral, cuja incidência recai sobre procedimentos eletivos e consultas em regime ambulatorial, ressalvadas as hipóteses previstas na cláusula décima segunda do instrumento contratual vigente, que trata dos períodos de carência aplicáveis a beneficiários ingressantes.

O processo de confirmação de adesão observará as seguintes providências. Primeiro, o beneficiário titular deverá acessar o portal do beneficiário mediante utilização das credenciais previamente cadastradas junto ao setor de recursos humanos da empresa contratante, sendo certo que credenciais expiradas demandarão solicitação de nova senha provisória. Em seguida, será necessário localizar, no menu denominado Minhas Contratações, a opção de confirmação referente ao produto identificado pelo registro ANS constante do cartão de identificação, conferindo atentamente se o número de registro apresentado na tela corresponde exatamente àquele impresso no verso do referido cartão, uma vez que a existência de mais de um produto ativo é situação corriqueira em contratos coletivos e a confirmação equivocada implica perda do prazo. Depois, o beneficiário deverá revisar o rol de dependentes previamente cadastrados, promovendo a exclusão daqueles que não mais atendam aos requisitos de elegibilidade e a inclusão de eventuais novos dependentes, observado que inclusões realizadas fora do período de movimentação cadastral estarão sujeitas ao cumprimento integral dos prazos de carência. Por fim, após a conferência de todos os dados, deverá ser registrada a aceitação eletrônica dos termos, momento em que o sistema emitirá protocolo numerado, cuja guarda é de responsabilidade exclusiva do beneficiário e constitui única prova de adesão tempestiva.

O prazo improrrogável para a conclusão de todas as providências acima descritas é de cinco dias úteis contados da data de recebimento deste comunicado, não se admitindo, em nenhuma hipótese, alegação de desconhecimento fundada em falha de recebimento de correspondência eletrônica, considerando que o envio ao endereço cadastrado no sistema de folha de pagamento constitui, para todos os efeitos, notificação válida e eficaz. A ausência de manifestação no prazo assinalado será interpretada como anuência tácita à migração automática, nos termos da RN aplicável e do que dispõe o CDC quanto à informação adequada, sem prejuízo do direito de revisão posterior mediante abertura de protocolo junto à ouvidoria, cujo prazo de resposta é de até sete dias úteis.`;

export default function Page() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "56px 24px", fontFamily: "Georgia, serif", background: "#fff", color: "#111" }}>
      <h1 style={{ fontFamily: "system-ui", fontSize: 26, lineHeight: 1.25 }}>
        Comunicado aos beneficiários — confirmação de adesão ao produto contratado
      </h1>
      <p style={{ fontFamily: "system-ui", fontSize: 13, color: "#888" }}>Departamento de Benefícios · circular interna</p>
      <article>
        {TEXTO.split("\n\n").map((p, i) => (
          <p key={i} style={{ fontSize: 17, lineHeight: 1.75, textAlign: "justify", margin: "0 0 22px" }}>{p}</p>
        ))}
      </article>
    </main>
  );
}
