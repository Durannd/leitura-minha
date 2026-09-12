const TEXTO = `O presente edital estabelece as normas gerais para o processo seletivo de concessão de bolsas de estudo remanescentes do programa institucional de apoio à permanência estudantil, destinadas a estudantes regularmente matriculados em cursos de graduação presencial, cuja renda familiar bruta mensal per capita não exceda um salário mínimo e meio, comprovada mediante documentação idônea apresentada no ato da inscrição, sendo vedada a acumulação com qualquer outra modalidade de auxílio de natureza semelhante concedido pela mesma instituição ou por órgão de fomento externo, ressalvados os casos expressamente autorizados pela PROAE mediante parecer fundamentado.

O candidato deverá observar rigorosamente o seguinte procedimento. Primeiro, efetuar o preenchimento integral do formulário eletrônico disponibilizado no SIGAA, atentando para o fato de que campos assinalados como obrigatórios não admitem preenchimento posterior e que o sistema encerra automaticamente o recebimento de inscrições às vinte e três horas e cinquenta e nove minutos do último dia do período. Em seguida, anexar, em formato PDF e em arquivo único não superior a dez megabytes, a totalidade dos documentos comprobatórios relacionados no anexo II, observando que documentos ilegíveis, incompletos ou apresentados em formato diverso do exigido acarretarão o indeferimento sumário da inscrição, sem possibilidade de complementação. Depois, imprimir e guardar o comprovante de inscrição gerado pelo sistema, documento que constitui a única prova de submissão tempestiva e cuja ausência impossibilita a interposição de recurso. Por fim, acompanhar diariamente a publicação dos resultados no portal institucional, uma vez que não haverá comunicação individualizada por correio eletrônico ou telefone.

A classificação dos candidatos observará, cumulativamente e nesta ordem, os critérios de menor renda per capita apurada, maior coeficiente de rendimento acadêmico, maior carga horária integralizada e maior idade, sendo o resultado preliminar publicado no prazo de quinze dias corridos contados do encerramento das inscrições. Da decisão preliminar caberá recurso, dirigido à comissão julgadora, no prazo improrrogável de dois dias úteis contados da publicação, exclusivamente por meio do formulário eletrônico específico, sendo liminarmente indeferidos recursos genéricos, intempestivos ou que se limitem a reiterar argumentos já apreciados. A interposição de recurso não suspende os prazos subsequentes previstos no cronograma do anexo I.`;

export default function Page() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px", fontFamily: "Times New Roman, serif", background: "#fff", color: "#111" }}>
      <h1 style={{ fontSize: 24, lineHeight: 1.3, textAlign: "center", textTransform: "uppercase" }}>
        Edital nº 14/2026 — bolsas remanescentes de apoio à permanência
      </h1>
      <p style={{ fontSize: 13, color: "#888", textAlign: "center" }}>Pró-Reitoria de Assuntos Estudantis</p>
      <article>
        {TEXTO.split("\n\n").map((p, i) => (
          <p key={i} style={{ fontSize: 16.5, lineHeight: 1.8, textAlign: "justify", textIndent: 32, margin: "0 0 20px" }}>{p}</p>
        ))}
      </article>
    </main>
  );
}
