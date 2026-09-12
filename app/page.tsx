import Link from "next/link";

const DEMOS = [
  { href: "/demo/artigo-marketing", titulo: "A ferramenta gratuita virou a nova isca de lead", nota: "artigo de mercado — colide com 2 campanhas ativas e 1 movimento de concorrente" },
  { href: "/demo/plano-de-saude", titulo: "Comunicado de plano de saúde", nota: "parede de texto: 50,4 palavras por frase" },
  { href: "/demo/edital", titulo: "Edital de bolsa de estudos", nota: "prosa jurídica corrida" },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6, color: "#16181c" }}>
      <h1 style={{ fontSize: 30, margin: "0 0 10px", letterSpacing: "-.02em" }}>Leitura Minha</h1>
      <p style={{ color: "#5a6069", margin: "0 0 10px", fontSize: 17 }}>
        A extensão lê o artigo junto com você — no formato que você aprovou — e cruza cada trecho com o contexto da sua empresa:
        campanhas em andamento, concorrentes monitorados, posicionamento.
      </p>
      <p style={{ color: "#858b93", margin: "0 0 36px", fontSize: 14 }}>
        O insight não fica numa sidebar de chat. Ele fica grifado na frase que o gerou.
      </p>

      <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: ".06em", color: "#858b93" }}>Páginas de teste</p>
      <div style={{ display: "grid", gap: 10 }}>
        {DEMOS.map((d) => (
          <Link key={d.href} href={d.href} style={{ display: "block", border: "1px solid #e4e6e9", borderRadius: 12, padding: "14px 16px", textDecoration: "none", color: "inherit", background: "#fff" }}>
            <b style={{ fontSize: 15 }}>{d.titulo}</b>
            <div style={{ fontSize: 13, color: "#858b93", marginTop: 3 }}>{d.nota}</div>
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 36, fontSize: 13.5, color: "#858b93" }}>
        Carregue a pasta <code>extension/</code> em <code>chrome://extensions</code> (modo desenvolvedor), abra uma página acima, aperte F5 e clique em <b>Adaptar para mim</b>.
      </p>
    </main>
  );
}
