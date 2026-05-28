import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Wand2, Shirt, Ruler, Loader2, LogOut, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

type Profile = { display_name: string | null; avatar_url: string | null };

function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  if (loading || !user) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const name = profile?.display_name || user.email?.split("@")[0] || "Stylist";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="glass-strong flex flex-col gap-4 rounded-3xl p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-blue-500 btn-glow text-white font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Welcome back</p>
            <h1 className="text-xl font-semibold md:text-2xl">{name}</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button onClick={handleSignOut} disabled={signingOut} variant="outline" className="glass border-white/10 hover:bg-white/5">
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Sign out</>}
        </Button>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-400" />
          <h2 className="text-lg font-semibold">Your AI studio</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/try-on", icon: Camera, title: "Virtual Try-On", desc: "Preview outfits on you in seconds." },
            { to: "/recommendations", icon: Wand2, title: "Smart Picks", desc: "Outfits tuned to occasion & weather." },
            { to: "/recommendations", icon: Shirt, title: "Wardrobe Match", desc: "Style what you already own." },
            { to: "/try-on", icon: Ruler, title: "Body-Fit", desc: "AI sizing for confident purchases." },
          ].map((c) => (
            <Card key={c.title} className="glass border-white/10 p-5 transition hover:bg-white/5">
              <c.icon className="h-5 w-5 text-fuchsia-400" />
              <h3 className="mt-3 font-medium">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <Button asChild size="sm" variant="link" className="mt-2 px-0 text-fuchsia-300">
                <Link to={c.to}>Open →</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}