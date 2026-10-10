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
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/settings" title="Settings">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut /> Keluar
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
