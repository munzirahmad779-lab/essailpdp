import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

function Layout() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !session) nav({ to: "/auth" });
  }, [loading, session, nav]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  }
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg">
            <GraduationCap className="size-5 text-gold" /> Wawancara LPDP
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut /> Keluar
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
