import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { authUser, CHAT_MODEL, createGateway, json, requireApiKey } from "@/lib/ai.server";

function systemPrompt(cv: string, essay: string) {
  return `Kamu adalah pewawancara senior beasiswa LPDP (Lembaga Pengelola Dana Pendidikan) Indonesia. Kamu memimpin simulasi wawancara substansi yang realistis, profesional, dan sedikit menantang, dalam Bahasa Indonesia.

Aturan:
- Ajukan SATU pertanyaan per giliran, singkat (maksimal 3 kalimat), karena jawabanmu juga akan dibacakan dengan suara.
- Jangan pakai markdown, bullet, atau emoji saat wawancara berjalan.
- Mulai dengan sapaan singkat dan minta kandidat memperkenalkan diri.
- Gali dari CV dan esai kandidat: motivasi, pemilihan kampus & jurusan, rencana studi, kontribusi untuk Indonesia, kepemimpinan, komitmen kembali ke Indonesia, wawasan kebangsaan, dan rencana pasca-studi.
- Kejar jawaban yang dangkal atau tidak konsisten dengan dokumen (follow-up kritis seperti panel LPDP sungguhan).
- Setelah sekitar 8-10 pertanyaan, atau jika kandidat meminta evaluasi/feedback, akhiri wawancara dan berikan evaluasi tertulis: skor 1-100, kekuatan, kelemahan, dan saran perbaikan konkret per jawaban. Pada evaluasi boleh memakai markdown.

=== CV KANDIDAT ===
${cv.slice(0, 15000) || "(tidak diunggah)"}

=== ESAI KANDIDAT ===
${essay.slice(0, 20000) || "(tidak diunggah)"}`;
}

export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authUser(request);
        if (!ctx) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
        const { messages, sessionId } = (await request.json()) as {
          messages: UIMessage[];
          sessionId: string;
        };
        if (!sessionId || !Array.isArray(messages)) return json({ error: "Permintaan tidak valid" }, 400);

        const { data: session, error } = await ctx.supabase
          .from("interview_sessions")
          .select("id, cv_text, essay_text")
          .eq("id", sessionId)
          .maybeSingle();
        if (error || !session) return json({ error: "Sesi tidak ditemukan" }, 404);

        const gateway = createGateway(requireApiKey());
        const result = streamText({
          model: gateway(CHAT_MODEL),
          system: systemPrompt(session.cv_text, session.essay_text),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: (e) => {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("402")) return "Kredit AI habis. Silakan isi ulang kredit workspace.";
            if (msg.includes("429")) return "Terlalu banyak permintaan. Coba lagi sebentar.";
            return "AI gagal menjawab. Coba lagi.";
          },
          onFinish: async ({ messages: all }) => {
            const { error: upErr } = await ctx.supabase
              .from("interview_sessions")
              .update({ messages: all as never, updated_at: new Date().toISOString() })
              .eq("id", sessionId);
            if (upErr) console.error("Gagal menyimpan pesan:", upErr.message);
          },
        });
      },
    },
  },
});
