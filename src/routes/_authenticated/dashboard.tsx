import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Riwayat Latihan — Wawancara LPDP" },
      { name: "description", content: "Daftar sesi latihan wawancara LPDP Anda." },
      { property: "og:title", content: "Riwayat Latihan — Wawancara LPDP" },
      { property: "og:description", content: "Daftar sesi latihan wawancara LPDP Anda." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("id,title,messages,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    if (!confirm("Hapus sesi ini?")) return;
    await supabase.from("interview_sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-primary">Riwayat latihan</h1>
          <p className="text-sm text-muted-foreground">Lanjutkan sesi lama atau mulai yang baru.</p>
        </div>
        <Button asChild variant="gold">
          <Link to="/new">
            <Plus /> Sesi baru
          </Link>
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Memuat…</p>}
        {data?.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            Belum ada sesi. Upload CV & esai untuk mulai.
          </div>
        )}
        {data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
            <Link to="/session/$id" params={{ id: s.id }} className="flex flex-1 items-center gap-3">
              <MessageSquare className="size-5 text-gold" />
              <div>
                <div className="font-medium text-primary">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {(s.messages as unknown[]).length} pesan ·{" "}
                  {format(new Date(s.updated_at), "d MMM yyyy, HH:mm", { locale: localeId })}
                </div>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => remove(s.id)} aria-label="Hapus">
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
