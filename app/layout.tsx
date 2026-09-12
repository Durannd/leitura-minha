import type { Metadata } from "next";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glosas Copilot · Contas Médicas",
  description: "Copiloto de conformidade documental para guias TISS, com aprovação humana por correção. Dados sintéticos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900">
        <CopilotKitProvider runtimeUrl="/api/copilotkit">{children}</CopilotKitProvider>
      </body>
    </html>
  );
}
