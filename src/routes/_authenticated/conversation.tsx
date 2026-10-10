import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { conversationOptions } from '@/lib/conversation-data';
import { messageText, type InterviewMessage, type Segment } from '@/lib/interview-history';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { toast } from "sonner";
import { Loader2, Mic, Square, Volume2, VolumeX, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authHeader } from "@/hooks/use-auth";
import { recordWav } from "@/lib/record-wav";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/conversation")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sesi Wawancara — LPDP AI" },
      { name: "description", content: "Simulasi wawancara LPDP dengan pewawancara AI." },
      { property: "og:title", content: "Sesi Wawancara — LPDP AI" },
      { property: "og:description", content: "Simulasi wawancara LPDP dengan pewawancara AI." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(conversationOptions),
  component: SessionPage,
});

function SessionPage() {
  const { data } = useSuspenseQuery(conversationOptions);
  return <ChatWindow key={data.id + data.segments.length} id={data.id} name={data.name} segments={data.segments} initial={data.messages} />;
}

function ChatWindow({ id, name, segments, initial }: { id: string; name: string; segments: Segment[]; initial: InterviewMessage[] }) {
  const active = segments.at(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingRef = useRef<null | { stop: () => Promise<File> }>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechAbort = useRef<AbortController | null>(null);
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [recording, setRecording] = useState<null | { stop: () => Promise<File> }>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<string | null>(initial.at(-1)?.id ?? null);

  const { messages, sendMessage, status, stop, error } = useChat<InterviewMessage>({
    id,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/interview",
      headers: authHeader,
      body: { conversationId: id, segmentId: active?.id },
    }),
    onError: (e) => toast.error(e.message || "Terjadi kesalahan"),
  });
  const busy = status === "submitted" || status === "streaming";

  const stopAudio = useCallback(() => {
    speechAbort.current?.abort();
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stopAudio();
    const controller = new AbortController();
    speechAbort.current = controller;
    setSpeaking(true);
    try {
      const res = await fetch('/api/speak', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Suara gagal diputar');
      const blob = await res.blob();
      if (controller.signal.aborted) return;
      if (!blob.size || !blob.type.startsWith('audio/')) throw new Error('Suara tidak tersedia.');
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stopAudio;
      audio.onerror = stopAudio;
      await audio.play();
    } catch (error) {
      if (!controller.signal.aborted) { setSpeaking(false); toast.error(error instanceof Error ? error.message : 'Suara gagal'); }
    }
  }, [stopAudio]);

  useEffect(() => {
    if (status !== 'ready') return;
    textareaRef.current?.focus();
    const last = messages.at(-1);
    if (!voiceOn || !last || last.role !== 'assistant' || spokenRef.current === last.id) return;
    spokenRef.current = last.id;
    void speak(messageText(last));
  }, [status, messages, voiceOn, speak]);

  useEffect(() => () => {
    speechAbort.current?.abort();
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    void recordingRef.current?.stop().catch(() => {});
  }, []);

  async function toggleMic() {
    if (recording) {
      setRecording(null);
      recordingRef.current = null;
      setTranscribing(true);
      try {
        const file = await recording.stop();
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/transcribe", { method: "POST", headers: await authHeader(), body: form });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Gagal mengenali suara");
        const text = (j.text as string).trim();
        if (text && active) { setInput(text); textareaRef.current?.focus(); }
        else toast.error("Suara tidak terdengar, coba lagi.");
      } catch (e) {
        toast.error((e as Error).message);
      }
      setTranscribing(false);
      return;
    }
    try {
      stopAudio();
      const rec = await recordWav();
      recordingRef.current = rec;
      setRecording(rec);
    } catch {
      toast.error("Izinkan akses mikrofon untuk menjawab dengan suara.");
    }
  }

  function submit() {
    const text = input.trim();
    if (!text || busy || !active) return;
    stopAudio();
    void sendMessage({ text, metadata: { segmentId: active.id } });
    setInput('');
    textareaRef.current?.focus();
  }

  function jump(segmentId: string) {
    document.getElementById(`segment-${segmentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="conversation-shell mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4">
        <div><h1 className="font-display text-xl text-primary">Percakapan wawancara</h1><p className="text-sm text-muted-foreground">{name || 'Kandidat LPDP'} · {segments.length} latihan</p></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Suara AI" aria-label="Suara AI" aria-pressed={voiceOn} onClick={() => { stopAudio(); setVoiceOn(!voiceOn); }}>{voiceOn ? <Volume2 /> : <VolumeX />}</Button>
          <Button asChild variant="outline" size="sm"><Link to="/profile">Profil</Link></Button>
          <Button asChild variant="gold" size="sm"><Link to="/new">Latihan berikutnya</Link></Button>
        </div>
      </div>
      {segments.length > 0 && <nav aria-label="Riwayat pewawancara" className="flex gap-2 overflow-x-auto border-b px-4 py-2">{segments.map((segment, index) => <Button key={segment.id} variant="ghost" size="sm" onClick={() => jump(segment.id)}>{index + 1}. {segment.interviewer_name}</Button>)}</nav>}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-8">
          {segments.length === 0 && <div className="py-12 text-center"><h2 className="font-display text-2xl text-primary">Latihan pertama Anda</h2><Button asChild variant="gold" className="mt-5"><Link to="/new">Upload CV & esai</Link></Button></div>}
          {segments.map((segment, index) => {
            const segmentMessages = messages.filter(m => m.metadata?.segmentId === segment.id);
            return <section key={segment.id} id={`segment-${segment.id}`} className="scroll-mt-4 space-y-5">
              <div className="border-b pb-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Latihan {index + 1} · {new Date(segment.created_at).toLocaleDateString('id-ID')}</p><h2 className="mt-1 font-display text-xl text-primary">{segment.interviewer_name}</h2><p className="text-sm text-muted-foreground">{segment.title}</p></div>
              {segmentMessages.map(m => <Message key={m.id} from={m.role}><p className="text-xs font-semibold text-muted-foreground">{m.role === 'assistant' ? segment.interviewer_name : name || 'Anda'}</p><MessageContent className={m.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground' : ''}>{m.parts.map((part,i) => part.type === 'text' ? m.role === 'assistant' ? <MessageResponse key={i}>{part.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{part.text}</p> : null)}</MessageContent>{m.role === 'assistant' && !busy && <Button variant="ghost" size="icon-sm" title="Putar suara" aria-label="Putar suara" onClick={() => void speak(messageText(m))}><Volume2 /></Button>}</Message>)}
              {!segmentMessages.length && segment.id === active?.id && <Button variant="gold" disabled={busy} onClick={() => void sendMessage({ text: 'Saya siap memulai latihan ini. Silakan ajukan pertanyaan pertama.', metadata: { segmentId: segment.id } })}>Mulai tanya jawab</Button>}
            </section>;
          })}
          {status === 'submitted' && <Shimmer>Pewawancara sedang berpikir…</Shimmer>}
          {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {active && <div className="border-t bg-background p-4">
        {speaking && <Button variant="ghost" size="sm" onClick={stopAudio}><Square /> Hentikan suara</Button>}
        <PromptInput onSubmit={submit}>
          <PromptInputTextarea ref={textareaRef} autoFocus value={input} onChange={e => setInput(e.target.value)} placeholder={recording ? 'Merekam jawaban…' : 'Jawaban Anda…'} disabled={recording !== null} />
          <PromptInputFooter>
            <div className="flex items-center gap-2">
              <Button type="button" variant={recording ? 'destructive' : 'ghost'} size="icon" title="Mikrofon untuk merekam jawaban" aria-label={recording ? 'Berhenti merekam' : 'Rekam jawaban'} disabled={transcribing || busy} onClick={() => void toggleMic()}>{transcribing ? <Loader2 className="animate-spin" /> : recording ? <Square /> : <Mic />}</Button>
              <span className="text-xs text-muted-foreground">{recording ? 'Sedang merekam' : transcribing ? 'Menyalin suara…' : active.interviewer_name}</span>
            </div>
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && (!input.trim() || !!recording || transcribing)} aria-label={busy ? 'Hentikan jawaban AI' : 'Kirim jawaban'} />
          </PromptInputFooter>
        </PromptInput>
        <Button variant="ghost" size="sm" className="mt-1" disabled={busy || messages.filter(m=>m.metadata?.segmentId===active.id).length < 3} onClick={() => void sendMessage({ text: 'Akhiri latihan ini dan berikan penilaian atas jawaban saya.', metadata: { segmentId: active.id } })}><ClipboardCheck /> Minta penilaian</Button>
      </div>}
    </div>
  );
}
