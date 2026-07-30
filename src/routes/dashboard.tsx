import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Search, Heart, Clock, Bookmark, Plus, ImageIcon, Settings, TrendingUp,
  Filter, Database, Download, Trash2, Share2, RefreshCw, AlertTriangle,
} from "lucide-react";
import {
  relativeTime, timeBucket, resolveImageUrls, TYPE_LABEL, downloadImage,
  toggleFavoriteGeneration, saveGeneration, deleteGeneration, deleteSavedOutfit,
  recordDownload, recordShare,
  type GenerationRow, type SavedOutfitRow, type UserStatistics, type GenerationType,
} from "@/lib/activity";

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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "recommendation", label: "Recommendations" },
  { key: "tryon", label: "Try-Ons" },
  { key: "body_analysis", label: "Body Analysis" },
  { key: "ai_studio", label: "AI Studio" },
  { key: "favorites", label: "Favorites" },
] as const;
type FilterKey = typeof FILTERS[number]["key"];

const BUCKET_ORDER = ["Today", "Yesterday", "Last week", "Last month", "Older"] as const;

function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [saved, setSaved] = useState<SavedOutfitRow[]>([]);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [syncingKb, setSyncingKb] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const ingestKb = useServerFn(ingestPendingKnowledge);

  const userId = user?.id;
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setDataLoading(true);
      try {
        const [genRes, savedRes, statRes] = await Promise.all([
          supabase
            .from("user_generations")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(60),
          supabase
            .from("saved_outfits")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase.from("user_statistics").select("*").eq("user_id", userId).maybeSingle(),
        ]);
        if (genRes.error) throw genRes.error;
        if (savedRes.error) throw savedRes.error;

        const gens = (genRes.data ?? []) as unknown as GenerationRow[];
        const savedRows = (savedRes.data ?? []) as unknown as SavedOutfitRow[];
        setGenerations(gens);
        setSaved(savedRows);
        setStats((statRes.data as unknown as UserStatistics) ?? null);
        setLoadError(null);

        const urls = await resolveImageUrls([
          ...gens.map((g) => g.image_url),
          ...savedRows.map((s) => s.image_url),
        ]);
        setImageMap(urls);
      } catch (e) {
        setLoadError((e as Error).message || "Could not load your activity.");
      } finally {
        setDataLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!userId) return;
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? null);
        setProfileLoading(false);
      });
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1)
      .then(({ data }) => setIsAdmin(!!data && data.length > 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void loadData();
  }, [userId, loadData]);

  // Realtime: any change to the user's activity refreshes the dashboard instantly.
  useEffect(() => {
    if (!userId) return;
    const scheduleRefresh = () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
      fetchTimer.current = setTimeout(() => void loadData(true), 250);
    };
    const channel = supabase.channel(`dashboard-${userId}`);
    for (const table of ["user_generations", "saved_outfits", "favorite_outfits", "user_statistics", "generation_images"]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        scheduleRefresh,
      );
    }
    channel.subscribe();
    return () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [userId, loadData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return generations.filter((g) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "favorites"
            ? g.is_favorite
            : g.generation_type === (filter as GenerationType);
      if (!matchesFilter) return false;
      if (!q) return true;
      return [
        g.outfit_name,
        g.prompt,
        g.occasion,
        g.style,
        g.weather,
        g.body_type,
        TYPE_LABEL[g.generation_type],
        ...(g.tags ?? []),
        ...(g.product_list ?? []).map((p) => p.name),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [generations, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, GenerationRow[]>();
    for (const g of filtered) {
      const b = timeBucket(g.created_at);
      map.set(b, [...(map.get(b) ?? []), g]);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => [b, map.get(b)!] as const);
  }, [filtered]);

  const handleSyncKnowledge = async () => {
    setSyncingKb(true);
    try {
      let remaining = Infinity;
      let totalProcessed = 0;
      let totalFailed = 0;
      while (remaining > 0) {
        const r = await ingestKb({ data: { batchSize: 25 } });
        totalProcessed += r.processed;
        totalFailed += r.failed;
        remaining = r.remaining;
        if (r.processed === 0) break;
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

  const totalGenerations = stats?.total_generations ?? generations.length;
  const savedLooks = stats?.saved_looks ?? saved.length;
  const favoriteCount = stats?.favorite_count ?? generations.filter((g) => g.is_favorite).length;
  const avgConfidence = stats?.average_confidence ?? 0;

  const statCards = [
    { label: "Generations", value: totalGenerations, icon: Sparkles },
    { label: "Saved looks", value: savedLooks, icon: Bookmark },
    { label: "Favorites", value: favoriteCount, icon: Heart },
    { label: "Avg. confidence", value: avgConfidence ? `${Math.round(avgConfidence)}%` : "—", icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      {/* Profile header */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5 md:p-7">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500 to-blue-500 btn-glow text-white text-lg font-semibold">
              {profileLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={`${name} avatar`} className="h-full w-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
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
            <Button
              onClick={() => { setRefreshing(true); void loadData(true); }}
              disabled={refreshing}
              size="sm"
              variant="outline"
              className="glass border-white/10 hover:bg-white/5"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4" /> Refresh</>}
            </Button>
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

        {/* Live statistics */}
        <div className="relative mt-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="glass rounded-2xl border-white/10 p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="mt-1 text-lg font-semibold md:text-2xl">
                {dataLoading ? <Skeleton className="h-6 w-12" /> : s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loadError && (
        <Card className="glass mt-6 flex items-center gap-3 border-red-500/30 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="flex-1 text-muted-foreground">{loadError}</span>
          <Button size="sm" variant="outline" className="glass border-white/10" onClick={() => void loadData()}>
            Retry
          </Button>
        </Card>
      )}

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
            { to: "/generate", icon: Shirt, title: "AI Studio", desc: "Ask your AI stylist." },
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

      {/* Recent activity */}
      <section className="mt-8 md:mt-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-fuchsia-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent AI activity</h2>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search outfits, occasions, items…"
              className="glass h-9 w-full border-white/10 pl-9 sm:w-72"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filter === f.key
                  ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200"
                  : "border-white/10 text-muted-foreground hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="glass border-white/10 p-4">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-5">
            <Card className="glass flex flex-col items-center justify-center gap-3 border-dashed border-white/10 px-6 py-14 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                <ImageIcon className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <h3 className="text-sm font-medium">
                  {query || filter !== "all" ? "No matching activity" : "No generations yet"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {query || filter !== "all"
                    ? "Try a different search or filter."
                    : "Create your first AI-styled outfit and it will appear here instantly."}
                </p>
              </div>
              <Button asChild size="sm" className="btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90">
                <Link to="/recommendations"><Plus className="h-4 w-4" /> Generate outfit</Link>
              </Button>
            </Card>
          </div>
        ) : (
          grouped.map(([bucket, items]) => (
            <div key={bucket} className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <span>{bucket}</span>
                <span className="h-px flex-1 bg-white/10" />
                <span>{items.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((g) => (
                  <GenerationCard
                    key={g.id}
                    gen={g}
                    imageUrl={g.image_url ? imageMap[g.image_url] : undefined}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Saved history */}
      <section className="mt-10 md:mt-14">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-fuchsia-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saved history</h2>
          </div>
          {saved.length > 0 && <span className="text-xs text-muted-foreground">{saved.length} saved</span>}
        </div>

        {dataLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="glass border-white/10 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </Card>
            ))}
          </div>
        ) : saved.length === 0 ? (
          <Card className="glass flex flex-col items-center justify-center gap-2 border-dashed border-white/10 px-6 py-10 text-center">
            <Bookmark className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Nothing saved yet</h3>
            <p className="text-xs text-muted-foreground">Tap save on any generated look to keep it here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((s) => (
              <Card key={s.id} className="glass flex items-center gap-3 border-white/10 p-3">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                  {s.image_url && imageMap[s.image_url] ? (
                    <img src={imageMap[s.image_url]} alt={s.outfit_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Sparkles className="h-4 w-4 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{s.outfit_name}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {TYPE_LABEL[s.generation_type as GenerationType] ?? s.generation_type} · {relativeTime(s.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {s.confidence_score != null && (
                    <Badge className="border-white/10 bg-black/40 text-[10px] text-white/90">{s.confidence_score}%</Badge>
                  )}
                  <button
                    aria-label="Remove saved look"
                    onClick={async () => {
                      await deleteSavedOutfit(s.id);
                      toast.success("Removed from saved.");
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GenerationCard({ gen, imageUrl }: { gen: GenerationRow; imageUrl?: string }) {
  const [busy, setBusy] = useState(false);

  const onFavorite = async () => {
    setBusy(true);
    await toggleFavoriteGeneration(gen.id, !gen.is_favorite);
    setBusy(false);
  };

  const onSave = async () => {
    setBusy(true);
    const ok = await saveGeneration(gen);
    setBusy(false);
    toast[ok ? "success" : "error"](ok ? "Saved to your history." : "Could not save this look.");
  };

  const onDownload = async () => {
    if (!imageUrl) return toast.error("No image available for this activity.");
    await downloadImage(imageUrl, `${(gen.outfit_name ?? "stylesync").replace(/\s+/g, "-").toLowerCase()}.png`);
    await recordDownload(gen.id, gen.download_count);
    toast.success("Download started.");
  };

  const onShare = async () => {
    const text = `${gen.outfit_name ?? "My StyleSync look"} — generated with StyleSync AI`;
    try {
      if (navigator.share) await navigator.share({ title: "StyleSync AI", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard.");
      }
      await recordShare(gen.id, gen.share_count);
    } catch {
      /* user dismissed */
    }
  };

  const onDelete = async () => {
    setBusy(true);
    await deleteGeneration(gen.id);
    toast.success("Removed from history.");
  };

  return (
    <Card className="glass group relative overflow-hidden border-white/10 p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500/15 via-purple-500/10 to-blue-500/15 ring-1 ring-white/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={gen.outfit_name ?? "AI generation"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : gen.image_status === "pending" ? (
          <div className="absolute inset-0 grid place-items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300" />
          </div>
        ) : gen.image_status === "failed" ? (
          <div className="absolute inset-0 grid place-items-center gap-1 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>Image unavailable</span>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Sparkles className="h-8 w-8 text-white/40" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex items-center gap-1">
          <Badge className="border-white/10 bg-black/40 text-[10px] font-medium text-white/90 backdrop-blur">
            {TYPE_LABEL[gen.generation_type]}
          </Badge>
        </div>
        <button
          onClick={onFavorite}
          disabled={busy}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60"
          aria-label={gen.is_favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-4 w-4 ${gen.is_favorite ? "fill-fuchsia-400 text-fuchsia-400" : ""}`} />
        </button>
        {gen.confidence_score != null && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
            {gen.confidence_score}% match
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="truncate text-sm font-medium">{gen.outfit_name ?? gen.prompt ?? "Untitled"}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[gen.occasion, gen.style, gen.recommended_size ? `Size ${gen.recommended_size}` : null]
            .filter(Boolean)
            .join(" · ") || TYPE_LABEL[gen.generation_type]}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">{relativeTime(gen.created_at)}</p>

        {(gen.product_list?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {gen.product_list.slice(0, 3).map((p, i) => (
              <li key={i} className="truncate">• {p.name}{p.color ? ` — ${p.color}` : ""}</li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center gap-1">
          <button onClick={onSave} disabled={busy || gen.is_saved} aria-label="Save look"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-fuchsia-300 disabled:opacity-40">
            <Bookmark className={`h-3.5 w-3.5 ${gen.is_saved ? "fill-fuchsia-400 text-fuchsia-400" : ""}`} />
          </button>
          <button onClick={onDownload} aria-label="Download image"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-fuchsia-300">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button onClick={onShare} aria-label="Share look"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-fuchsia-300">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} disabled={busy} aria-label="Delete from history"
            className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
