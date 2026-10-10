import { createFileRoute } from "@tanstack/react-router";
import {
  authUser,
  GATEWAY_URL,
  gatewayErrorMessage,
  json,
  requireApiKey,
  STT_MODEL,
} from "@/lib/ai.server";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authUser(request);
        if (!ctx) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || !file.size) return json({ error: "Rekaman kosong" }, 400);
        if (file.size > 24 * 1024 * 1024) return json({ error: "Rekaman terlalu panjang" }, 400);

        const body = new FormData();
        body.append("model", STT_MODEL);
        body.append("file", file, file.name || "recording.wav");
        body.append("response_format", "json");
        body.append("languages", "id");
        const res = await fetch(`${GATEWAY_URL}/v1/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${requireApiKey()}` },
          body,
        });
        if (!res.ok) {
          const t = await res.text();
          console.error("Transcribe failed", res.status, t);
          return json({ error: gatewayErrorMessage(res.status, t) }, res.status);
        }
        const data = (await res.json()) as { text?: string };
        return json({ text: data.text ?? "" });
      },
    },
  },
});
