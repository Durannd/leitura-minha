/** Contexto da empresa para o painel. No produto real vem do CRM/CMS do cliente; aqui é seed versionado. */
import { CONTEXTO_DEMO } from "@/lib/empresa/contexto";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }
export function GET() { return Response.json(CONTEXTO_DEMO, { headers: CORS }); }
