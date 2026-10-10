import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Masuk — Simulasi Wawancara LPDP" },
      {
        name: "description",
        content: "Masuk untuk menyimpan riwayat latihan wawancara LPDP Anda.",
      },
      { property: "og:title", content: "Masuk — Simulasi Wawancara LPDP" },
      { property: "og:description", content: "Masuk untuk menyimpan riwayat latihan wawancara." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) nav({ to: "/conversation" });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/auth",
          data: { display_name: name.trim() },
        },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Cek email Anda untuk konfirmasi akun.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-hero px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-card">
        <h1 className="font-display text-3xl text-primary">{mode === "in" ? "Masuk" : "Daftar"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Riwayat latihan Anda akan tersimpan.</p>
        <Button variant="outline" className="mt-6 w-full" onClick={google}>
          Lanjutkan dengan Google
        </Button>
        <div className="my-4 text-center text-xs text-muted-foreground">atau</div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <Input
              required
              aria-label="Nama profil"
              placeholder="Nama Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={6}
            placeholder="Kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {mode === "in" ? "Masuk" : "Buat akun"}
          </Button>
        </form>
        <Button
          variant="link"
          className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </Button>
      </div>
    </main>
  );
}
