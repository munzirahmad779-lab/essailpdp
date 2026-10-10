import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Mic, Volume2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulasi Wawancara LPDP dengan AI" },
      { name: "description", content: "Upload CV & esai, lalu latihan wawancara LPDP dengan pewawancara AI yang bisa diajak bicara." },
      { property: "og:title", content: "Simulasi Wawancara LPDP dengan AI" },
      { property: "og:description", content: "Latihan wawancara LPDP berbasis CV & esai Anda, lengkap dengan suara." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: FileText, title: "Dari dokumen Anda", text: "Pertanyaan digali langsung dari CV dan esai PDF Anda." },
  { icon: Mic, title: "Jawab dengan suara", text: "Tekan mikrofon dan bicara, jawaban otomatis jadi teks." },
  { icon: Volume2, title: "AI bicara balik", text: "Pewawancara membacakan pertanyaan seperti panel sungguhan." },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">
              <GraduationCap className="size-4" /> Latihan Wawancara Substansi
            </div>
            <h1 className="font-display text-4xl leading-tight md:text-6xl">
              Siap duduk di depan <span className="text-gold">panel LPDP</span>?
            </h1>
            <p className="mt-5 max-w-md text-primary-foreground/80">
              Upload CV dan esai Anda. Pewawancara AI akan bertanya, mengejar jawaban, dan memberi penilaian jujur.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link to="/dashboard">Mulai latihan</Link>
              </Button>
            </div>
          </div>
          <img
            src={hero}
            alt="Kandidat beasiswa menghadapi panel wawancara"
            width={1024}
            height={1024}
            className="aspect-square w-full rounded-3xl object-cover shadow-gold"
          />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-14 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl bg-card p-6 shadow-card">
            <f.icon className="size-6 text-gold" />
            <h3 className="mt-4 font-display text-xl text-primary">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
