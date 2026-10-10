import { createClient } from "@supabase/supabase-js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev";
export const CHAT_MODEL = "google/gemini-3.8-flash";
export const STT_MODEL = "openai/gpt-transcribe";
export const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
export const TTS_VOICE = "Kore";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function requireApiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY belum dikonfigurasi");
  return key;
}

/** Verifies the bearer token and returns a user-scoped client (RLS applies). */
export async function authUser(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const anon = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const auth = request.headers.get("authorization");
  if (!url || !anon || !auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const supabase = createClient<Database>(url, anon, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", anon);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export function createGateway(apiKey: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(undefined);
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: `${GATEWAY_URL}/v1`,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return Object.assign(provider, { getRunId: runIdFetch.getRunId, waitForRunId: runIdFetch.waitForRunId });
}

export function gatewayErrorMessage(status: number, body: string) {
  try {
    const data = JSON.parse(body);
    return data.message || data.error?.message || (typeof data.error === "string" ? data.error : `Layanan AI gagal (${status})`);
  } catch { return `Layanan AI gagal (${status}): ${body.slice(0, 300)}`; }
}
