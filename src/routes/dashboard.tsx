import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ingestPendingKnowledge } from "@/lib/rag.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera, Wand2, Shirt, Ruler, Loader2, LogOut, Sparkles,
  Search, Heart, Clock, Bookmark, Plus, ImageIcon, Settings, TrendingUp, Filter, Database,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Your Style Dashboard — StyleSync AI" },
      { name: "description", content: "Your AI generations, saved looks, and quick actions in one place." },
      { property: "og:title", content: "Your Style Dashboard — StyleSync AI" },
      { property: "og:description", content: "Your AI generations, saved looks, and quick actions in one place." },
      { property: "og:url", content: "https://new-stylesync-ai.lovable.app/dashboard" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://new-stylesync-ai.lovable.app/dashboard" }],
  }),
});

type Profile = { display_name: string | null; avatar_url: string | null };

type Generation = {
  id: string;
  title: string;
  type: "Try-On" | "Recommendation" | "Wardrobe";
  occasion: string;
  score: number;
  saved: boolean;
  createdAt: string;
};

const MOCK_GENERATIONS: Generation[] = [
  { id: "g1", title: "Minimal monochrome layering", type: "Recommendation", occasion: "Work", score: 94, saved: true,  createdAt: "2h ago" },
  { id: "g2", title: "Tailored blazer + wide-leg",   type: "Try-On",         occasion: "Date night", score: 91, saved: false, createdAt: "5h ago" },
  { id: "g3", title: "Streetwear weekend fit",       type: "Wardrobe",       occasion: "Casual", score: 88, saved: true,  createdAt: "Yesterday" },
  { id: "g4", title: "Linen summer set",             type: "Recommendation", occasion: "Vacation", score: 96, saved: false, createdAt: "2d ago" },
  { id: "g5", title: "Smart-casual interview look",  type: "Try-On",         occasion: "Work", score: 92, saved: true,  createdAt: "3d ago" },
  { id: "g6", title: "Athleisure travel outfit",     type: "Wardrobe",       occasion: "Travel", score: 85, saved: false, createdAt: "5d ago" },
];

const FILTERS = ["All", "Try-On", "Recommendation", "Wardrobe", "Saved"] as const;
type Filter = typeof FILTERS[number];

function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [genLoading, setGenLoading] = useState(true);
  const [syncingKb, setSyncingKb] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const ingestKb = useServerFn(ingestPendingKnowledge);

  const handleSyncKnowledge = async () => {
    setSyncingKb(true);
    try {
      let remaining = Infinity;
      let totalProcessed = 0;
      let totalFailed = 0;
      let iterations = 0;
      while (remaining > 0) {
        const r = await ingestKb({ data: { batchSize: 25 } });
        totalProcessed += r.processed;
        totalFailed += r.failed;
        remaining = r.remaining;
        iterations++;
        if (r.processed === 0) break; // avoid infinite loop if all keep failing
      }
      if (totalProcessed === 0 && totalFailed === 0) {
        toast.success("Knowledge base already up to date — all entries embedded.");
      } else {
        toast.success(
          `Knowledge base synced — ${totalProcessed} embedded${totalFailed ? `, ${totalFailed} failed` : ""}.`,
        );
      }
    } catch (e) {
      toast.error(`Sync failed: ${(e as Error).message}`);
    } finally {
      setSyncingKb(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? null);
        setProfileLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .then(({ data }) => setIsAdmin(!!data && data.length > 0));
  }, [user]);

  // Simulate fetching recent AI generations
  useEffect(() => {
    if (!user) return;
    setGenLoading(true);
    const t = setTimeout(() => {
      setGenerations(MOCK_GENERATIONS);
      setGenLoading(false);
    }, 700);
    return () => clearTimeout(t);
  }, [user]);

  const filtered = useMemo(() => {
    return generations.filter((g) => {
      const matchesFilter =
        filter === "All" ? true : filter === "Saved" ? g.saved : g.type === filter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.occasion.toLowerCase().includes(q) ||
        g.type.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [generations, filter, query]);

  const toggleSaved = (id: string) =>
    setGenerations((prev) => prev.map((g) => (g.id === id ? { ...g, saved: !g.saved } : g)));

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
  const savedItems = generations.filter((g) => g.saved);
  const stats = [
    { label: "Generations", value: generations.length, icon: Sparkles },
    { label: "Saved looks", value: savedItems.length, icon: Bookmark },
    { label: "Avg. confidence", value: generations.length ? `${Math.round(generations.reduce((a, g) => a + g.score, 0) / generations.length)}%` : "—", icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      {/* Profile header */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5 md:p-7">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-blue-500 btn-glow text-white text-lg font-semibold">
              {profileLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold md:text-2xl">Your Style Dashboard</h1>
              {profileLoading ? (
                <Skeleton className="mt-1 h-4 w-40" />
              ) : (
                <p className="truncate text-sm text-muted-foreground">Welcome back, {name}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="glass border-white/10 hover:bg-white/5">
              <Link to="/dashboard"><Settings className="h-4 w-4" /> Profile</Link>
            </Button>
            <Button onClick={handleSignOut} disabled={signingOut} size="sm" variant="outline" className="glass border-white/10 hover:bg-white/5">
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Sign out</>}
            </Button>
            {isAdmin && (
              <Button onClick={handleSyncKnowledge} disabled={syncingKb} size="sm" className="bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white">
                {syncingKb ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Database className="h-4 w-4" /> Sync AI Knowledge</>}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-6 grid grid-cols-3 gap-2 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl border-white/10 p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="mt-1 text-lg font-semibold md:text-2xl">
                {genLoading ? <Skeleton className="h-6 w-12" /> : s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <section className="mt-8 md:mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/try-on", icon: Camera, title: "Virtual Try-On", desc: "Preview outfits on you." },
            { to: "/recommendations", icon: Wand2, title: "Smart Picks", desc: "AI-tuned daily outfits." },
            { to: "/recommendations", icon: Shirt, title: "Wardrobe Match", desc: "Style what you own." },
            { to: "/try-on", icon: Ruler, title: "Body-Fit", desc: "Confident sizing." },
          ].map((c) => (
            <Link key={c.title} to={c.to} className="group">
              <Card className="glass relative h-full overflow-hidden border-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.07]">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                  <c.icon className="h-4 w-4 text-fuchsia-300" />
                </div>
                <h3 className="mt-3 text-sm font-medium">{c.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
                <span className="mt-2 inline-block text-xs text-fuchsia-300 opacity-0 transition group-hover:opacity-100">Open →</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent AI generations + search/filter */}
      <section className="mt-8 md:mt-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-fuchsia-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent AI generations</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search outfits, occasions…"
                className="glass h-9 w-full border-white/10 pl-9 sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filter === f
                  ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200"
                  : "border-white/10 text-muted-foreground hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {genLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="glass border-white/10 p-4">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <Card className="glass flex flex-col items-center justify-center gap-3 border-dashed border-white/10 px-6 py-14 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                  <ImageIcon className="h-5 w-5 text-fuchsia-300" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">No generations yet</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {query || filter !== "All"
                      ? "Try a different search or filter."
                      : "Create your first AI-styled outfit to see it here."}
                  </p>
                </div>
                <Button asChild size="sm" className="btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90">
                  <Link to="/recommendations"><Plus className="h-4 w-4" /> Generate outfit</Link>
                </Button>
              </Card>
            </div>
          ) : (
            filtered.map((g) => (
              <Card key={g.id} className="glass group relative overflow-hidden border-white/10 p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500/15 via-purple-500/10 to-blue-500/15 ring-1 ring-white/10">
                  <div className="absolute inset-0 grid place-items-center">
                    <Sparkles className="h-8 w-8 text-white/40" />
                  </div>
                  <div className="absolute left-2 top-2 flex items-center gap-1">
                    <Badge className="border-white/10 bg-black/40 text-[10px] font-medium text-white/90 backdrop-blur">
                      {g.type}
                    </Badge>
                  </div>
                  <button
                    onClick={() => toggleSaved(g.id)}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60"
                    aria-label={g.saved ? "Unsave" : "Save"}
                  >
                    <Heart className={`h-4 w-4 ${g.saved ? "fill-fuchsia-400 text-fuchsia-400" : ""}`} />
                  </button>
                  <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
                    {g.score}% match
                  </div>
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">{g.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.occasion} · {g.createdAt}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Saved history */}
      <section className="mt-10 md:mt-14">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-fuchsia-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saved history</h2>
          </div>
          {savedItems.length > 0 && (
            <span className="text-xs text-muted-foreground">{savedItems.length} saved</span>
          )}
        </div>

        {genLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="glass border-white/10 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </Card>
            ))}
          </div>
        ) : savedItems.length === 0 ? (
          <Card className="glass flex flex-col items-center justify-center gap-2 border-dashed border-white/10 px-6 py-10 text-center">
            <Bookmark className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Nothing saved yet</h3>
            <p className="text-xs text-muted-foreground">Tap the heart on any look to keep it here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {savedItems.map((g) => (
              <Card key={g.id} className="glass flex items-center gap-3 border-white/10 p-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                  <Sparkles className="h-4 w-4 text-fuchsia-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{g.title}</h3>
                  <p className="truncate text-xs text-muted-foreground">{g.type} · {g.occasion} · {g.createdAt}</p>
                </div>
                <Badge className="border-white/10 bg-white/5 text-[10px] text-white/90">{g.score}%</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}