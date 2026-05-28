import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Home" },
  { to: "/try-on", label: "Virtual Try-On" },
  { to: "/recommendations", label: "Recommendations" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { session, loading } = useAuth();
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <div className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-blue-500 btn-glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              StyleSync <span className="text-gradient">AI</span>
            </span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground [&.active]:text-foreground [&.active]:bg-white/10"
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            {!loading && (
              session ? (
                <Button asChild size="sm" className="ml-2 btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="ml-2 glass border-white/10 hover:bg-white/5">
                  <Link to="/login">Sign in</Link>
                </Button>
              )
            )}
          </nav>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-white/5"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
        {open && (
          <div className="glass mt-2 flex flex-col rounded-2xl p-2 md:hidden">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground [&.active]:text-foreground"
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5 py-10">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} StyleSync AI — Your personal AI stylist.
      </div>
    </footer>
  );
}