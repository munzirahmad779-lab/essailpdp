import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mic, Send, Square, Volume2, VolumeX, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authHeader } from "@/hooks/use-auth";
import { recordWav } from "@/lib/record-wav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/session/$id")({
  head: () => ({
    meta: [
      { title: "Sesi Wawancara — LPDP AI" },
      { name: "description", content: "Simulasi wawancara LPDP dengan pewawancara AI." },
      { property: "og:title", content: "Sesi Wawancara — LPDP AI" },
      { property: "og:description", content: "Simulasi wawancara LPDP dengan pewawancara AI." },
    ],
  }),
  component: SessionPage,
});

function SessionPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("interview_sessions").select("id,title,messages").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat sesi…</div>;
  if (error || !data) return <div className="p-8 text-center text-destructive">Sesi tidak ditemukan.</div>;
  return <ChatWindow key={id} id={id} title={data.title} initial={data.messages as unknown as UIMessage[]} />;
}

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function ChatWindow({ id, title, initial }: { id: string; title: string; initial: UIMessage[] }) {
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [recording, setRecording] = useState<null | { stop: () => Promise<File> }>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<string | null>(initial.at(-1)?.id ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const { messages, sendMessage, status, stop, error } = useChat({
    id,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/interview",
      headers: authHeader,
      body: { sessionId: id },
    }),
    onError: (e) => toast.error(e.message || "Terjadi kesalahan"),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!started.current && initial.length === 0) {
      started.current = true;
      sendMessage({ text: "Selamat pagi, saya siap memulai wawancara." });
    }
  }, [initial.length, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speak the newest assistant message once it finishes streaming
  useEffect(() => {
    if (status !== "ready" || !voiceOn) return;
    const last = messages.at(-1);
    if (!last || last.role !== "assistant" || spokenRef.current === last.id) return;
    spokenRef.current = last.id;
    void speak(textOf(last));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages, voiceOn]);

  async function speak(text: string) {
    if (!text.trim()) return;
    setSpeaking(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Suara gagal diputar");
      }
      const url = URL.createObjectURL(await res.blob());
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      await audio.play();
    } catch (e) {
      setSpeaking(false);
      toast.error((e as Error).message);
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    setSpeaking(false);
  }

  async function toggleMic() {
    if (recording) {
      setRecording(null);
      setTranscribing(true);
      try {
        const file = await recording.stop();
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/transcribe", { method: "POST", headers: await authHeader(), body: form });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Gagal mengenali suara");
        const text = (j.text as string).trim();
        if (text) sendMessage({ text });
        else toast.error("Suara tidak terdengar, coba lagi.");
      } catch (e) {
        toast.error((e as Error).message);
      }
      setTranscribing(false);
      return;
    }
    try {
      stopAudio();
      setRecording(await recordWav());
    } catch {
      toast.error("Izinkan akses mikrofon untuk menjawab dengan suara.");
    }
  }

  function submit() {
    const t = input.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  const visible = messages.filter((m, i) => !(i === 0 && m.role === "user" && initial.length === 0) || messages.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard" aria-label="Kembali">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 truncate font-display text-lg text-primary">{title}</h1>
        <Button variant="ghost" size="icon" onClick={() => (voiceOn ? (stopAudio(), setVoiceOn(false)) : setVoiceOn(true))} aria-label="Suara AI">
          {voiceOn ? <Volume2 /> : <VolumeX />}
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {visible.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
            {m.role === "assistant" && (
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm text-gold">
                P
              </div>
            )}
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
                  : "prose prose-sm max-w-[85%] text-foreground [&_h1]:font-display [&_h2]:font-display [&_strong]:text-primary"
              }
            >
              {m.role === "user" ? <p className="whitespace-pre-wrap">{textOf(m)}</p> : <ReactMarkdown>{textOf(m)}</ReactMarkdown>}
              {m.role === "assistant" && status === "ready" && (
                <button onClick={() => speak(textOf(m))} className="mt-1 text-xs text-muted-foreground hover:text-primary">
                  ▶ Putar suara
                </button>
              )}
            </div>
          </div>
        ))}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Pewawancara sedang berpikir…
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t bg-background/95 px-4 pb-4 pt-3 backdrop-blur">
        {speaking && (
          <button onClick={stopAudio} className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Square className="size-3" /> Pewawancara berbicara… ketuk untuk berhenti
          </button>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant={recording ? "destructive" : "gold"}
            size="icon"
            className={`size-12 shrink-0 rounded-full ${recording ? "animate-pulse-ring" : ""}`}
            onClick={toggleMic}
            disabled={transcribing || busy}
            aria-label={recording ? "Berhenti merekam" : "Jawab dengan suara"}
          >
            {transcribing ? <Loader2 className="animate-spin" /> : recording ? <Square /> : <Mic />}
          </Button>
          <Textarea
            autoFocus
            rows={1}
            value={input}
            placeholder={recording ? "Merekam… ketuk lagi untuk selesai" : "Ketik jawaban atau tekan mikrofon"}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="max-h-40 min-h-12 resize-none"
          />
          {busy ? (
            <Button size="icon" variant="outline" className="size-12 shrink-0" onClick={stop} aria-label="Stop">
              <Square />
            </Button>
          ) : (
            <Button size="icon" className="size-12 shrink-0" onClick={submit} disabled={!input.trim()} aria-label="Kirim">
              <Send />
            </Button>
          )}
        </div>
        <button
          disabled={busy || messages.length < 3}
          onClick={() => sendMessage({ text: "Tolong akhiri wawancara dan berikan evaluasi lengkap atas jawaban saya." })}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary disabled:opacity-40"
        >
          <ClipboardCheck className="size-3.5" /> Akhiri & minta penilaian
        </button>
      </div>
    </div>
  );
}
