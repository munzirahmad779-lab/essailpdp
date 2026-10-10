import { createFileRoute } from "@tanstack/react-router";
import { authUser, GATEWAY_URL, gatewayErrorMessage, json, requireApiKey, TTS_MODEL, TTS_VOICE } from "@/lib/ai.server";

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authUser(request);
        if (!ctx) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
        const { text } = (await request.json()) as { text?: string };
        const clean = (text ?? "").replace(/[*#_`>]/g, "").trim().slice(0, 2500);
        if (!clean) return json({ error: "Teks kosong" }, 400);

        const res = await fetch(`${GATEWAY_URL}/v1/audio/speech`, {
          method: "POST",
          headers: { Authorization: `Bearer ${requireApiKey()}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: TTS_MODEL,
            contents: [
              {
                role: "user",
                parts: [{ text: `Ucapkan dengan nada profesional dan ramah seperti pewawancara: ${clean}` }],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
            },
          }),
          signal: request.signal,
        });
        if (!res.ok || !res.body) {
          const t = await res.text();
          console.error("TTS failed", res.status, t);
          return json({ error: gatewayErrorMessage(res.status, t) }, res.status || 500);
        }
        return new Response(res.body, {
          headers: { "Content-Type": res.headers.get("content-type") ?? "audio/wav" },
        });
      },
    },
  },
});
