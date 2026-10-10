import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";

import { GraduationCap, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/conversation" className="flex items-center gap-2 font-display text-lg">
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
