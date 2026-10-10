import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileUp, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfText } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sesi Baru — Wawancara LPDP" },
      { name: "description", content: "Upload CV dan esai PDF untuk memulai simulasi wawancara LPDP." },
      { property: "og:title", content: "Sesi Baru — Wawancara LPDP" },
      { property: "og:description", content: "Upload CV dan esai PDF untuk memulai simulasi." },
    ],
  }),
  component: NewSession,
});

type Doc = { name: string; text: string } | null;

function PdfSlot({ label, hint, doc, onDoc }: { label: string; hint: string; doc: Doc; onDoc: (d: Doc) => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("File harus PDF"); return; }
    setBusy(true);
    try {
      const text = await extractPdfText(file);
      if (!text) toast.error("Teks tidak terbaca. Pastikan PDF bukan hasil scan gambar.");
      else onDoc({ name: file.name, text });
    } catch (e) {
      console.error(e);
      toast.error("Gagal membaca PDF");
    }
    setBusy(false);
  }
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card p-5 transition hover:border-gold">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
        {busy ? <Loader2 className="animate-spin" /> : doc ? <Check className="text-gold" /> : <FileUp />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-primary">{label}</div>
        <div className="truncate text-sm text-muted-foreground">
          {doc ? `${doc.name} · ${doc.text.length.toLocaleString("id")} karakter` : hint}
        </div>
      </div>
      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}

function NewSession() {
  const nav = useNavigate();
  const [interviewer, setInterviewer] = useState("Panel LPDP");
  const [title, setTitle] = useState("");
  const [cv, setCv] = useState<Doc>(null);
  const [essay, setEssay] = useState<Doc>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!cv && !essay) { toast.error("Upload minimal satu dokumen"); return; }
    setBusy(true);
    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({
        interviewer_name: interviewer.trim() || "Panel LPDP",
        title: title.trim() || `Latihan ${new Date().toLocaleDateString("id-ID")}`,
        cv_text: cv?.text ?? "",
        essay_text: essay?.text ?? "",
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data) nav({ to: "/conversation" });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl text-primary">Latihan berikutnya</h1>
      <p className="text-sm text-muted-foreground">Dokumen dibaca di perangkat Anda, lalu dipakai AI untuk menyusun pertanyaan.</p>
      <div className="mt-6 space-y-4">
        <Input aria-label="Nama pewawancara" placeholder="Nama pewawancara" value={interviewer} onChange={(e) => setInterviewer(e.target.value)} />
        <Input placeholder="Judul sesi (mis. Magister Kebijakan Publik)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <PdfSlot label="CV (PDF)" hint="Riwayat pendidikan, organisasi, prestasi" doc={cv} onDoc={setCv} />
        <PdfSlot label="Esai (PDF)" hint="Kontribusiku untuk Indonesia / rencana studi" doc={essay} onDoc={setEssay} />
        <Button variant="gold" size="lg" className="w-full" onClick={create} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Mulai wawancara
        </Button>
      </div>
    </main>
  );
}
