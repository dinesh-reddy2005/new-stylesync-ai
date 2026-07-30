import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createParser } from "eventsource-parser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Wand2,
  Sparkles,
  Loader2,
  Shirt,
  Info,
  Camera,
  Bookmark,
  Heart,
  Download,
  User,
  Ruler,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  logGeneration,
  attachGenerationImage,
  markImageFailed,
  saveGeneration,
  toggleFavoriteGeneration,
  recordDownload,
  downloadImage,
  type GenerationRow,
} from "@/lib/activity";
import {
  generateOutfits,
  type ScoredOutfit,
} from "@/lib/recommendations.functions";
import { getBodyProfile, loadPhotoDataUrl, type BodyProfile } from "@/lib/body-profile";

export const Route = createFileRoute("/recommendations")({
  component: Recs,
  head: () => ({
    meta: [
      { title: "Smart Outfit Recommendations — StyleSync AI" },
      { name: "description", content: "Get AI outfit ideas tailored to occasion, weather, and personal style. Generate new looks in seconds." },
      { property: "og:title", content: "Smart Outfit Recommendations — StyleSync AI" },
      { property: "og:description", content: "AI outfit ideas tailored to occasion, weather, and personal style." },
      { property: "og:url", content: "https://new-stylesync-ai.lovable.app/recommendations" },
      { name: "twitter:title", content: "Smart Outfit Recommendations — StyleSync AI" },
      { name: "twitter:description", content: "AI outfit ideas tailored to occasion, weather, and personal style." },
    ],
    links: [{ rel: "canonical", href: "https://new-stylesync-ai.lovable.app/recommendations" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Smart Outfit Recommendations",
        url: "https://new-stylesync-ai.lovable.app/recommendations",
        description: "AI-generated outfit ideas tailored to occasion, weather, and style.",
      }),
    }],
  }),
});

const OCCASIONS = ["Casual", "Work", "Business", "Date", "Party", "Wedding", "Travel", "Workout"];
const WEATHERS = ["Sunny", "Cloudy", "Rainy", "Snowy", "Windy", "Humid"];
const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
const TIMES = ["Morning", "Afternoon", "Evening", "Night"];
const STYLES = ["Minimal", "Streetwear", "Classic", "Y2K", "Bohemian", "Sporty", "Luxury", "Preppy"];
const TRENDS = ["Quiet Luxury", "Old Money", "Coastal Grandpa", "Balletcore", "Techwear", "Neo-Nostalgia", "Monochrome"];
const GENDERS = ["Woman", "Man", "Non-binary"];
const BODY_TYPES = ["Athletic", "Rectangle", "Pear", "Hourglass", "Inverted Triangle", "Oval"];
const FITS = ["Slim", "Regular", "Oversized"];
const SKIN_TONES = ["Warm", "Cool", "Neutral", "Deep", "Fair"];
const COLOR_PRESETS = [
  "Neutrals", "Earth Tones", "Jewel Tones", "Pastels", "Monochrome", "Bold Brights",
];

type Profile = {
  gender: string;
  bodyType: string;
  heightCm: number;
  skinTone: string;
  hairColor: string;
  faceShape: string;
  ageGroup: string;
  preferredFit: string;
  preferredColors: string[];
};

type Filters = {
  occasion: string;
  weather: string;
  temperatureC: number;
  season: string;
  timeOfDay: string;
  style: string;
  trend: string;
  location: string;
};

const PROFILE_KEY = "stylesync.rec.profile";
const SEEN_KEY = "stylesync.rec.seen";

/** Map analysis vocabulary onto the profile panel's option lists. */
function mapBodyType(v?: string | null): string | null {
  switch (v) {
    case "Triangle":
      return "Pear";
    case "Trapezoid":
    case "Muscular":
      return "Athletic";
    case "Slim":
      return "Rectangle";
    case "Athletic":
    case "Rectangle":
    case "Inverted Triangle":
    case "Oval":
      return v;
    default:
      return null;
  }
}

function mapSkinTone(v?: string | null): string | null {
  if (!v) return null;
  const t = v.toLowerCase();
  if (t.includes("fair") || t.includes("light")) return "Fair";
  if (t.includes("deep") || t.includes("dark")) return "Deep";
  if (t.includes("cool")) return "Cool";
  if (t.includes("warm") || t.includes("olive") || t.includes("tan")) return "Warm";
  return "Neutral";
}

function mapFit(v?: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("Slim")) return "Slim";
  if (v.startsWith("Relaxed")) return "Oversized";
  return "Regular";
}

function mapGender(v?: string | null): string | null {
  if (!v) return null;
  if (/^man$|^male$/i.test(v)) return "Man";
  if (/^woman$|^female$/i.test(v)) return "Woman";
  return null;
}

function loadProfile(): Profile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...defaultProfile(), ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

function defaultProfile(): Profile {
  return {
    gender: "Woman",
    bodyType: "Hourglass",
    heightCm: 168,
    skinTone: "Warm",
    hairColor: "Brunette",
    faceShape: "Oval",
    ageGroup: "25-34",
    preferredFit: "Regular",
    preferredColors: ["Neutrals"],
  };
}

function Recs() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(() =>
    typeof window === "undefined" ? defaultProfile() : loadProfile(),
  );
  const [filters, setFilters] = useState<Filters>({
    occasion: "Work",
    weather: "Sunny",
    temperatureC: 22,
    season: "Spring",
    timeOfDay: "Afternoon",
    style: "Minimal",
    trend: "Quiet Luxury",
    location: "",
  });
  const [outfits, setOutfits] = useState<ScoredOutfit[]>([]);
  const [images, setImages] = useState<Record<number, { src: string; final: boolean }>>({});
  const [tryons, setTryons] = useState<Record<number, { src: string; final: boolean }>>({});
  const [tryonStatus, setTryonStatus] = useState<Record<number, "pending" | "running" | "done" | "failed">>({});
  const [genIds, setGenIds] = useState<Record<number, string>>({});
  const [savedIdx, setSavedIdx] = useState<Record<number, boolean>>({});
  const [favIdx, setFavIdx] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | null>(null);
  const [bodyPhoto, setBodyPhoto] = useState<string | null>(null);
  const [bodyLoading, setBodyLoading] = useState(true);
  const seenRef = useRef<string[]>([]);
  const seedRef = useRef(0);
  const previewRef = useRef<Record<number, string>>({});

  const generate = useServerFn(generateOutfits);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) seenRef.current = JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* ignore */
    }
  }, [profile]);

  // One photo, one analysis — reused by every recommendation on this page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bp = await getBodyProfile();
        if (cancelled) return;
        setBodyProfile(bp);
        if (bp?.photoPath) {
          const url = await loadPhotoDataUrl(bp.photoPath);
          if (!cancelled) setBodyPhoto(url);
        }
        if (bp?.analysis) {
          const a = bp.analysis;
          setProfile((prev) => ({
            ...prev,
            gender: mapGender(a.apparentGender) ?? prev.gender,
            bodyType: mapBodyType(a.bodyType) ?? prev.bodyType,
            heightCm: Math.round(a.proportions?.heightCm ?? prev.heightCm),
            skinTone: mapSkinTone(a.skinTone) ?? prev.skinTone,
            hairColor: a.hairColor && a.hairColor !== "Unspecified" ? a.hairColor : prev.hairColor,
            faceShape: a.faceShape || prev.faceShape,
            preferredFit: mapFit(a.fitStyle) ?? prev.preferredFit,
          }));
        }
      } finally {
        if (!cancelled) setBodyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Render the recommended outfit onto the user's stored photo. */
  const streamTryOnFor = useCallback(
    async (
      index: number,
      outfit: ScoredOutfit,
      outfitImageDataUrl: string | null,
      photo: string,
      token: string,
      generationId?: string | null,
    ) => {
      const res = await fetch("/api/tryon-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          imageDataUrl: photo,
          outfitPrompt: outfit.imagePrompt,
          outfitImageDataUrl,
        }),
      });
      if (!res.ok || !res.body) {
        let msg = `Try-on failed (${res.status})`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      let sawCompleted = false;
      const parser = createParser({
        onEvent(event) {
          if (
            event.event !== "image_generation.partial_image" &&
            event.event !== "image_generation.completed"
          )
            return;
          let payload: { b64_json?: string };
          try {
            payload = JSON.parse(event.data);
          } catch {
            return;
          }
          if (!payload.b64_json) return;
          const isFinal = event.event === "image_generation.completed";
          const src = `data:image/png;base64,${payload.b64_json}`;
          flushSync(() => {
            setTryons((prev) => ({ ...prev, [index]: { src, final: isFinal } }));
          });
          if (isFinal) {
            sawCompleted = true;
            if (generationId) void attachGenerationImage(generationId, "tryon", src);
          }
        },
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(value);
        }
      } finally {
        reader.cancel().catch(() => {});
      }
      if (!sawCompleted) throw new Error("Try-on stream ended without completion");
    },
    [],
  );

  const streamImage = useCallback(
    async (index: number, prompt: string, token: string, generationId?: string | null) => {
      const res = await fetch("/api/outfit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        throw new Error(`Image (${res.status}): ${t.slice(0, 200)}`);
      }
      let sawCompleted = false;
      let streamError: string | undefined;
      const parser = createParser({
        onEvent(event) {
          let payload: {
            type?: string;
            b64_json?: string;
            error?: { message?: string };
          } | undefined;
          try {
            payload = JSON.parse(event.data);
          } catch {
            /* keep */
          }
          if (event.event === "error" || payload?.type === "error") {
            streamError = payload?.error?.message ?? "Image generation failed";
            return;
          }
          if (
            event.event !== "image_generation.partial_image" &&
            event.event !== "image_generation.completed"
          )
            return;
          if (!payload?.b64_json) return;
          const isFinal = event.event === "image_generation.completed";
          const src = `data:image/png;base64,${payload.b64_json}`;
          flushSync(() => {
            setImages((prev) => ({ ...prev, [index]: { src, final: isFinal } }));
          });
          if (isFinal) sawCompleted = true;
          if (isFinal && generationId) {
            void attachGenerationImage(generationId, "preview", src);
          }
          if (isFinal) previewRef.current[index] = src;
        },
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(value);
        }
      } finally {
        reader.cancel().catch(() => {});
      }
      if (streamError) throw new Error(streamError);
      if (!sawCompleted) throw new Error("Image stream ended without completion");
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setOutfits([]);
    setImages({});
    setTryons({});
    setTryonStatus({});
    previewRef.current = {};
    try {
      seedRef.current += 1;
      const { outfits: raw } = await generate({
        data: {
          profile,
          filters,
          excludeSignatures: seenRef.current,
          seed: seedRef.current,
        },
      });
      const top = raw.slice(0, 4);
      if (top.length === 0) {
        toast.info("No new outfits available — try changing filters.");
        setLoading(false);
        return;
      }
      setOutfits(top);
      setSavedIdx({});
      setFavIdx({});
      setGenIds({});
      seenRef.current = [...seenRef.current, ...top.map((o) => o.signature)].slice(-80);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(seenRef.current));
      } catch {
        /* ignore */
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        toast.error("Sign in to render outfit previews.");
        return;
      }

      // Persist every generated outfit as real user activity.
      const ids = await Promise.all(
        top.map((o) =>
          logGeneration({
            generationType: "recommendation",
            prompt: o.imagePrompt,
            occasion: filters.occasion,
            weather: `${filters.weather} · ${filters.temperatureC}°C`,
            style: filters.style,
            bodyType: profile.bodyType,
            outfitName: o.title,
            productList: o.items.map((it) => ({
              name: it.name,
              color: it.color,
              category: it.category,
            })),
            colorPalette: o.colorPalette,
            tags: [o.category, filters.season, filters.timeOfDay, filters.trend].filter(Boolean),
            confidenceScore: o.confidence,
            metadata: { scores: o.scores, signature: o.signature },
          }),
        ),
      );
      const idMap: Record<number, string> = {};
      ids.forEach((id, i) => {
        if (id) idMap[i] = id;
      });
      setGenIds(idMap);

      await Promise.all(
        top.map((o, i) =>
          streamImage(i, o.imagePrompt, token, ids[i]).catch((e) => {
            console.error("image", i, e);
            if (ids[i]) void markImageFailed(ids[i]!, "preview", (e as Error).message);
          }),
        ),
      );

      // Same photo, every look: render each recommendation on the user in sequence.
      if (bodyPhoto) {
        setTryonStatus(Object.fromEntries(top.map((_, i) => [i, "pending" as const])));
        for (let i = 0; i < top.length; i++) {
          setTryonStatus((p) => ({ ...p, [i]: "running" }));
          try {
            await streamTryOnFor(i, top[i], previewRef.current[i] ?? null, bodyPhoto, token, ids[i]);
            setTryonStatus((p) => ({ ...p, [i]: "done" }));
          } catch (e) {
            console.error("tryon", i, e);
            setTryonStatus((p) => ({ ...p, [i]: "failed" }));
            if (ids[i]) void markImageFailed(ids[i]!, "tryon", (e as Error).message);
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate outfits.");
    } finally {
      setLoading(false);
    }
  }, [generate, profile, filters, streamImage, streamTryOnFor, bodyPhoto]);

  const paletteSummary = useMemo(() => profile.preferredColors.join(", "), [profile.preferredColors]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-center">
        <Badge className="glass border-white/10 text-fuchsia-300">Smart Outfit Recommendations</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          Outfits tailored <span className="text-gradient">to your body & moment</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          A live AI stylist that reads your profile, weighs 12 combinations, and renders the top 4 with matching product imagery.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="glass-strong h-fit border-white/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Shirt className="h-4 w-4 text-fuchsia-300" /> Your profile
          </div>
          <Select label="Gender" value={profile.gender} options={GENDERS} onChange={(v) => setProfile({ ...profile, gender: v })} />
          <Select label="Body type" value={profile.bodyType} options={BODY_TYPES} onChange={(v) => setProfile({ ...profile, bodyType: v })} />
          <Row>
            <NumberField label="Height (cm)" value={profile.heightCm} onChange={(n) => setProfile({ ...profile, heightCm: n })} min={140} max={210} />
            <TextField label="Age group" value={profile.ageGroup} onChange={(v) => setProfile({ ...profile, ageGroup: v })} placeholder="25-34" />
          </Row>
          <Select label="Skin tone" value={profile.skinTone} options={SKIN_TONES} onChange={(v) => setProfile({ ...profile, skinTone: v })} />
          <Row>
            <TextField label="Hair color" value={profile.hairColor} onChange={(v) => setProfile({ ...profile, hairColor: v })} placeholder="Brunette" />
            <TextField label="Face shape" value={profile.faceShape} onChange={(v) => setProfile({ ...profile, faceShape: v })} placeholder="Oval" />
          </Row>
          <Select label="Preferred fit" value={profile.preferredFit} options={FITS} onChange={(v) => setProfile({ ...profile, preferredFit: v })} />
          <div className="mb-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Preferred colors</div>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => {
                const active = profile.preferredColors.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() =>
                      setProfile({
                        ...profile,
                        preferredColors: active
                          ? profile.preferredColors.filter((x) => x !== c)
                          : [...profile.preferredColors, c],
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      active
                        ? "bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white btn-glow"
                        : "glass text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {paletteSummary && (
              <p className="mt-2 text-[10px] text-muted-foreground">Selected: {paletteSummary}</p>
            )}
          </div>
        </Card>

        <div>
          <Card className="glass-strong border-white/10 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-fuchsia-300" /> Context filters
            </div>
            <ChipGroup label="Occasion" options={OCCASIONS} value={filters.occasion} onChange={(v) => setFilters({ ...filters, occasion: v })} />
            <ChipGroup label="Weather" options={WEATHERS} value={filters.weather} onChange={(v) => setFilters({ ...filters, weather: v })} />
            <Row>
              <NumberField label="Temperature (°C)" value={filters.temperatureC} onChange={(n) => setFilters({ ...filters, temperatureC: n })} min={-20} max={45} />
              <TextField label="Location (optional)" value={filters.location} onChange={(v) => setFilters({ ...filters, location: v })} placeholder="Tokyo" />
            </Row>
            <ChipGroup label="Season" options={SEASONS} value={filters.season} onChange={(v) => setFilters({ ...filters, season: v })} />
            <ChipGroup label="Time of day" options={TIMES} value={filters.timeOfDay} onChange={(v) => setFilters({ ...filters, timeOfDay: v })} />
            <ChipGroup label="Style" options={STYLES} value={filters.style} onChange={(v) => setFilters({ ...filters, style: v })} />
            <ChipGroup label="Fashion trend" options={TRENDS} value={filters.trend} onChange={(v) => setFilters({ ...filters, trend: v })} />
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-glow mt-2 w-full bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90 sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Styling…
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" /> Generate outfits
                </>
              )}
            </Button>
          </Card>

          <h2 className="mt-8 text-lg font-semibold tracking-tight">Recommended Outfits</h2>
          {outfits.length === 0 && !loading && (
            <Card className="glass mt-4 border-white/10 p-8 text-center text-sm text-muted-foreground">
              Set your profile and filters, then generate. Every set is fresh — no repeats within your session.
            </Card>
          )}
          {loading && outfits.length === 0 && (
            <Card className="glass mt-4 flex items-center justify-center gap-2 border-white/10 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing 12 combinations…
            </Card>
          )}
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {outfits.map((o, i) => (
              <OutfitCard
                key={o.signature + seedRef.current}
                outfit={o}
                image={images[i]}
                saved={!!savedIdx[i]}
                favorite={!!favIdx[i]}
                onSave={async () => {
                  const id = genIds[i];
                  if (!id) return toast.error("Sign in to save looks.");
                  const ok = await saveGeneration({
                    id,
                    outfit_name: o.title,
                    generation_type: "recommendation",
                    image_url: null,
                    image_status: images[i]?.final ? "ready" : "pending",
                    confidence_score: o.confidence,
                    product_list: o.items.map((it) => ({ name: it.name, color: it.color })),
                    tags: [o.category],
                    is_favorite: !!favIdx[i],
                  } as unknown as GenerationRow);
                  if (ok) {
                    setSavedIdx((p) => ({ ...p, [i]: true }));
                    toast.success("Saved to your dashboard.");
                  } else toast.error("Could not save this look.");
                }}
                onFavorite={async () => {
                  const id = genIds[i];
                  if (!id) return toast.error("Sign in to favorite looks.");
                  const next = !favIdx[i];
                  setFavIdx((p) => ({ ...p, [i]: next }));
                  await toggleFavoriteGeneration(id, next);
                  toast.success(next ? "Added to favorites." : "Removed from favorites.");
                }}
                onDownload={async () => {
                  const img = images[i];
                  if (!img?.src) return toast.error("Preview is still rendering.");
                  await downloadImage(img.src, `${o.title.replace(/\s+/g, "-").toLowerCase()}.png`);
                  const id = genIds[i];
                  if (id) await recordDownload(id, 0);
                  toast.success("Download started.");
                }}
                onTryOn={() => navigate({ to: "/try-on" })}
                onDetails={() => toast.message(o.title, { description: buildDetails(o) })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildDetails(o: ScoredOutfit): string {
  const parts = o.items.map((it) => `${it.name} (${it.color})`).join(" · ");
  const s = o.scores;
  return `${parts}\nBody ${s.bodyMatch}% · Occasion ${s.occasionMatch}% · Weather ${s.weatherMatch}% · Style ${s.stylePref}% · Trend ${s.trendMatch}%`;
}

function OutfitCard({
  outfit,
  image,
  saved,
  favorite,
  onSave,
  onFavorite,
  onDownload,
  onTryOn,
  onDetails,
}: {
  outfit: ScoredOutfit;
  image: { src: string; final: boolean } | undefined;
  saved: boolean;
  favorite: boolean;
  onSave: () => void;
  onFavorite: () => void;
  onDownload: () => void;
  onTryOn: () => void;
  onDetails: () => void;
}) {
  return (
    <Card className="glass group overflow-hidden border-white/10 transition hover:border-fuchsia-500/40 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
        {image ? (
          <img
            src={image.src}
            alt={outfit.title}
            className={`absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-700 ease-out ${
              image.final ? "blur-0" : "blur-2xl"
            } group-hover:scale-105`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering outfit…
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
          <Sparkles className="h-3 w-3 text-fuchsia-300" /> {outfit.category}
        </div>
        <div className="absolute top-2 right-2 z-10 rounded-full glass px-2 py-0.5 text-[10px] font-medium">
          {outfit.confidence}% match
        </div>
        <div className="absolute bottom-2 right-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={onFavorite}
            aria-label="Favorite outfit"
            className="glass grid h-8 w-8 place-items-center rounded-full border border-white/10 hover:border-fuchsia-400/60"
          >
            <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-fuchsia-400 text-fuchsia-400" : "text-white"}`} />
          </button>
          <button
            onClick={onDownload}
            aria-label="Download outfit image"
            className="glass grid h-8 w-8 place-items-center rounded-full border border-white/10 hover:border-fuchsia-400/60"
          >
            <Download className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold">{outfit.title}</div>

        <div className="mt-2 flex flex-wrap gap-1">
          <BadgePill>{outfit.category}</BadgePill>
          <BadgePill>Style: {outfit.scores.stylePref}%</BadgePill>
          <BadgePill>Weather: {outfit.scores.weatherMatch}%</BadgePill>
        </div>

        {outfit.colorPalette.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {outfit.colorPalette.map((c, idx) => (
              <span
                key={c + idx}
                className="h-4 w-4 rounded-full border border-white/20"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        )}

        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {outfit.items.map((it, idx) => (
            <li key={idx}>
              • <span className="text-foreground/90">{it.name}</span>{" "}
              <span className="opacity-60">— {it.color}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-2">
          <Bar label="Body Match" value={outfit.scores.bodyMatch} />
          <Bar label="Confidence" value={outfit.confidence} accent />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={onTryOn}
            className="btn-glow flex-1 bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90"
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" /> Virtual Try-On
          </Button>
          <Button size="sm" variant="ghost" className="glass" onClick={onDetails}>
            <Info className="mr-1.5 h-3.5 w-3.5" /> Details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="glass"
            onClick={onSave}
            disabled={saved}
            aria-label="Save outfit"
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-fuchsia-400 text-fuchsia-400" : ""}`} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}

function Bar({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{clamped}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-[width] duration-700 ease-out ${
            accent
              ? "bg-gradient-to-r from-fuchsia-500 to-blue-500"
              : "bg-gradient-to-r from-blue-400 to-fuchsia-400"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              value === o
                ? "bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white btn-glow"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass h-9 w-full rounded-md border border-white/10 bg-transparent px-3 text-sm text-foreground outline-none focus:border-fuchsia-500/40"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-background text-foreground">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-3 flex-1">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="glass h-9 border-white/10 bg-transparent text-sm"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="mb-3 flex-1">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="glass h-9 border-white/10 bg-transparent text-sm"
      />
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3">{children}</div>;
}