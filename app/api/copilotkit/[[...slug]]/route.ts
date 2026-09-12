import { BuiltInAgent, CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { criarModeloAgente, descreverModelo, provedorDisponivel } from "@/lib/llm";
import { SISTEMA_ADAPTADOR } from "@/lib/prompts";

const info = descreverModelo();
if (provedorDisponivel()) {
  console.log(`[copilotkit] provedor=${info.provedor} modelo=${info.modelo}${info.fallbacks.length ? ` fallback=${info.fallbacks.join(",")}` : ""}`);
} else {
  console.warn("[copilotkit] nenhuma chave de modelo (OPENROUTER_API_KEY ou OPENAI_API_KEY); a sidebar vai responder com erro de chave");
}

const agent = new BuiltInAgent({
  // Sem chave, mantém um modelo string para o runtime subir e devolver o erro de chave em tempo de execução.
  model: provedorDisponivel() ? criarModeloAgente() : "openai/gpt-5.4-mini",
  prompt: SISTEMA_ADAPTADOR,
  maxSteps: 5,
  temperature: 0.2,
  // Sem limite, a OpenRouter reserva o máximo do modelo (65k tokens) e recusa com 402 quando o saldo não cobre a reserva.
  maxOutputTokens: Number(process.env.LLM_MAX_OUTPUT_TOKENS ?? 2048),
});

const runtime = new CopilotRuntime({ agents: { default: agent } });

const handler = createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" });

export const GET = handler;
export const POST = handler;
