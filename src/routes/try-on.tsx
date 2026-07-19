import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Wand2, Camera, Ruler, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { analyzeBody, type BodyAnalysis } from "@/lib/tryon.functions";
import { supabase } from "@/integrations/supabase/client";
import mensBusiness from "@/assets/outfits/mens-business.jpg";
import mensSmartCasual from "@/assets/outfits/mens-smart-casual.jpg";
import mensStreetwear from "@/assets/outfits/mens-streetwear.jpg";
import mensTuxedo from "@/assets/outfits/mens-tuxedo.jpg";
import womensSmartCasual from "@/assets/outfits/womens-smart-casual.jpg";
import womensEvening from "@/assets/outfits/womens-evening.jpg";

export const Route = createFileRoute("/try-on")({
  head: () => ({
    meta: [
      { title: "Virtual AI Try-On — StyleSync AI" },
      { name: "description", content: "Upload your photo and preview outfits instantly with photorealistic AI rendering and body-fit analysis." },
      { property: "og:title", content: "Virtual AI Try-On — StyleSync AI" },
      { property: "og:description", content: "Upload your photo and preview outfits instantly with photorealistic AI rendering and body-fit analysis." },
      { property: "og:url", content: "https://new-stylesync-ai.lovable.app/try-on" },
      { name: "twitter:title", content: "Virtual AI Try-On — StyleSync AI" },
      { name: "twitter:description", content: "Upload your photo and preview outfits instantly with photorealistic AI rendering and body-fit analysis." },
    ],
    links: [{ rel: "canonical", href: "https://new-stylesync-ai.lovable.app/try-on" }],
  }),
  component: TryOn,
});

type Outfit = {
  id: string;
  name: string;
  gender: "Men" | "Women";
  category: string;
  fit: string;
  tags: string[];
  image: string;
  prompt: string;
  recommended?: boolean;
};

const OUTFITS: Outfit[] = [
  {
    id: "mens-business",
    name: "Business Professional",
    gender: "Men",
    category: "Business",
    fit: "Slim Fit",
    tags: ["Business", "Office", "Interview", "Premium"],
    image: mensBusiness,
    prompt:
      "men's business professional outfit: navy slim-fit two-button blazer, crisp white Oxford button-down shirt, tailored grey formal trousers, brown leather Oxford dress shoes, brown leather belt",
    recommended: true,
  },
  {
    id: "mens-smart-casual",
    name: "Smart Casual",
    gender: "Men",
    category: "Casual",
    fit: "Regular Fit",
    tags: ["Casual", "College", "Weekend"],
    image: mensSmartCasual,
    prompt:
      "men's smart casual outfit: plain white crew-neck t-shirt, light blue washed denim jacket layered over it, black slim-fit jeans, clean white low-top sneakers",
  },
  {
    id: "mens-streetwear",
    name: "Streetwear",
    gender: "Men",
    category: "Streetwear",
    fit: "Oversized",
    tags: ["Streetwear", "Urban", "Trending"],
    image: mensStreetwear,
    prompt:
      "men's streetwear outfit: black oversized pullover hoodie, grey cargo pants with side pockets and drawstring cuffs, white chunky sneakers, black crossbody sling bag worn across the chest",
    recommended: true,
  },
  {
    id: "mens-tuxedo",
    name: "Luxury Tuxedo",
    gender: "Men",
    category: "Formal",
    fit: "Tailored Fit",
    tags: ["Wedding", "Luxury", "Formal"],
    image: mensTuxedo,
    prompt:
      "men's luxury black tuxedo: black peak-lapel tuxedo jacket with satin lapels, crisp white formal pleated shirt, black bow tie, matching black tuxedo trousers, black patent leather Oxford shoes",
  },
  {
    id: "womens-smart-casual",
    name: "Smart Casual",
    gender: "Women",
    category: "Office",
    fit: "Regular Fit",
    tags: ["Office", "Casual", "Modern"],
    image: womensSmartCasual,
    prompt:
      "women's smart casual outfit: beige tailored single-button blazer, white fitted top underneath, blue straight-leg jeans, white low-top sneakers",
    recommended: true,
  },
  {
    id: "womens-evening",
    name: "Evening Party",
    gender: "Women",
    category: "Evening",
    fit: "Body Fit",
    tags: ["Party", "Luxury", "Evening"],
    image: womensEvening,
    prompt:
      "women's evening party outfit: elegant fitted black midi dress with long sleeves, nude pointed-toe stiletto heels, small silver metallic clutch bag",
  },
];

function TryOn() {
  const analyzeFn = useServerFn(analyzeBody);
  const fileRef = useRef<HTMLInputElement>(null);

  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [selected, setSelected] = useState<Outfit | null>(null);
  const [genderFilter, setGenderFilter] = useState<"All" | "Men" | "Women">("All");

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusText, setStatusText] = useState<string>("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image too large. Please use an image under 8MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(f);
    setOriginalDataUrl(dataUrl);
    setPreviewSrc(dataUrl);
    setIsFinal(true);
    setAnalysis(null);
    setSelected(null);

    setAnalyzing(true);
    setStatusText("Analyzing body structure…");
    try {
      const result = await analyzeFn({ data: { imageDataUrl: dataUrl } });
      setAnalysis(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Body analysis failed.");
    } finally {
      setAnalyzing(false);
      setStatusText("");
    }
  }

  async function generateTryOn(outfit: Outfit) {
    if (!originalDataUrl) {
      toast.error("Upload a photo first.");
      return;
    }
    setSelected(outfit);
    setGenerating(true);
    setIsFinal(false);
    setStatusText("Generating AI outfit fit…");

    try {
      const outfitImageDataUrl = await urlToDataUrl(outfit.image);
      await streamTryOn(
        originalDataUrl,
        outfit.prompt,
        outfitImageDataUrl,
        (dataUrl, final) => {
          setPreviewSrc(dataUrl);
          if (final) setIsFinal(true);
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Try-on generation failed.");
      setPreviewSrc(originalDataUrl);
      setIsFinal(true);
    } finally {
      setGenerating(false);
      setStatusText("");
    }
  }

  const visibleOutfits = OUTFITS.filter(
    (o) => genderFilter === "All" || o.gender === genderFilter,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <Badge className="glass border-white/10 text-fuchsia-300">AI Virtual Try-On</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          See it on <span className="text-gradient">you</span> first
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Upload a full-body photo. Our AI analyzes your proportions and renders real outfits onto your body.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Upload + preview */}
        <Card className="glass-strong border-white/10 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-fuchsia-300" /> Your photo
            </h2>
            {originalDataUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="text-muted-foreground"
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Replace
              </Button>
            )}
          </div>

          <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/30">
            {previewSrc ? (
              <>
                <img
                  src={previewSrc}
                  alt={selected ? `Wearing ${selected.name}` : "Your upload"}
                  className={`h-full w-full object-cover transition-[filter] duration-300 ${
                    isFinal ? "blur-0" : "blur-xl"
                  }`}
                />
                {(analyzing || generating) && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-fuchsia-400" />
                      <p className="text-sm text-fuchsia-100/90">{statusText}</p>
                    </div>
                  </div>
                )}
                {selected && isFinal && !generating && (
                  <div className="absolute bottom-3 left-3 right-3 glass rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Wearing</span>
                      <span className="font-medium">{selected.name}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 grid place-items-center"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-blue-500/30 border border-white/10">
                    <Upload className="h-6 w-6 text-fuchsia-300" />
                  </div>
                  <div>
                    <p className="font-medium">Upload your photo</p>
                    <p className="text-xs text-muted-foreground">JPG or PNG • full body works best</p>
                  </div>
                </div>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />

          {originalDataUrl && (
            <Button
              variant="outline"
              onClick={() => {
                setPreviewSrc(originalDataUrl);
                setIsFinal(true);
                setSelected(null);
              }}
              disabled={generating || !selected}
              className="mt-4 w-full border-white/10"
            >
              Reset to original photo
            </Button>
          )}
        </Card>

        {/* Controls */}
        <div className="space-y-6">
          <Card className="glass border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">Choose an outfit</h3>
              <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5 text-[11px]">
                {(["All", "Men", "Women"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={`px-3 py-1 rounded-full transition ${
                      genderFilter === g
                        ? "bg-gradient-to-r from-fuchsia-500/80 to-blue-500/80 text-white"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {visibleOutfits.map((o, idx) => (
                <button
                  key={o.id}
                  onClick={() => generateTryOn(o)}
                  disabled={!originalDataUrl || analyzing || generating}
                  className={`group relative overflow-hidden rounded-[20px] border text-left transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/30 hover:-translate-y-0.5 hover:shadow-fuchsia-500/20 ${
                    selected?.id === o.id
                      ? "border-fuchsia-400/80 ring-2 ring-fuchsia-400/40 shadow-fuchsia-500/30"
                      : "border-white/10 hover:border-fuchsia-400/50"
                  } bg-gradient-to-b from-white to-slate-100`}
                >
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <span className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur">
                      {o.category}
                    </span>
                    {o.recommended && (
                      <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow">
                    {o.gender}
                  </div>
                  <div className="relative aspect-[3/4] flex items-center justify-center overflow-hidden">
                    <img
                      src={o.image}
                      alt={`${o.name} — ${o.tags.join(", ")}`}
                      loading={idx < 6 ? "eager" : "lazy"}
                      decoding="async"
                      width={768}
                      height={1024}
                      className="h-[85%] w-[85%] object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="border-t border-slate-200/70 bg-white/80 px-3 py-2.5 backdrop-blur">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {o.name}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-fuchsia-600">
                        {o.fit}
                      </span>
                    </div>
                  </div>
                  {selected?.id === o.id && generating && (
                    <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm rounded-[20px]">
                      <div className="flex flex-col items-center gap-1.5">
                        <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300" />
                        <span className="text-[10px] text-fuchsia-100">Generating AI preview…</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {!originalDataUrl && (
              <p className="mt-3 text-xs text-muted-foreground">Upload a photo to enable try-on.</p>
            )}
          </Card>

          <Card className="glass border-white/10 p-5">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ruler className="h-4 w-4" /> Body-Fit Analysis
            </h3>
            {analyzing ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing body structure…
              </div>
            ) : analysis ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Shoulders" value={analysis.shoulders} />
                  <Stat label="Waist" value={analysis.waist} />
                  <Stat label="Torso" value={analysis.torso} />
                  <Stat label="Body type" value={analysis.bodyType} />
                  <Stat label="Height ratio" value={`${analysis.heightRatio.toFixed(1)} heads`} />
                  <Stat label="Confidence" value={`${Math.round(analysis.confidence)}%`} />
                </div>
                <FitRow label="Shoulder fit" value={analysis.measurements.shoulderFit} />
                <FitRow label="Waist fit" value={analysis.measurements.waistFit} />
                <FitRow label="Length" value={analysis.measurements.lengthFit} />
                <FitRow label="Overall comfort" value={analysis.measurements.comfort} />
                <div className="rounded-xl glass-strong p-3 text-sm">
                  <span className="text-muted-foreground">Recommended size: </span>
                  <span className="font-medium text-fuchsia-300">{analysis.recommendedSize}</span>
                </div>
                <div className="rounded-xl glass-strong p-3 text-xs leading-relaxed text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 text-fuchsia-300" />
                  {analysis.reasoning}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Upload a full-body photo to see size and fit insights.
              </p>
            )}
          </Card>

          {selected && analysis && isFinal && !generating && (
            <Card className="glass border-white/10 p-5">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-fuchsia-300" /> Why this outfit
              </h3>
              <p className="mt-2 text-sm">
                The {selected.name.toLowerCase()} suits your{" "}
                <span className="text-fuchsia-300">{analysis.shoulders}</span> shoulders and{" "}
                <span className="text-fuchsia-300">{analysis.waist}</span> waist
                  {selected.fit === "Oversized"
                  ? " — the relaxed cut adds visual volume while staying balanced."
                    : selected.category === "Formal" || selected.category === "Business"
                    ? " — tailored lines elongate your silhouette."
                    : selected.category === "Streetwear"
                      ? " — layered proportions complement your frame."
                      : " — soft fabrics drape naturally on your body type."}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  );
}

function FitRow({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(v)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const outfitDataUrlCache = new Map<string, string>();
async function urlToDataUrl(url: string): Promise<string> {
  const cached = outfitDataUrlCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load outfit image.");
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read outfit image"));
    reader.readAsDataURL(blob);
  });
  outfitDataUrlCache.set(url, dataUrl);
  return dataUrl;
}

async function streamTryOn(
  imageDataUrl: string,
  outfitPrompt: string,
  outfitImageDataUrl: string | null,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to use virtual try-on.");
  const res = await fetch("/api/tryon-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageDataUrl, outfitPrompt, outfitImageDataUrl }),
  });
  if (!res.ok || !res.body) {
    let msg = `Try-on failed (${res.status})`;
    try {
      const j = await res.json();
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
      flushSync(() => {
        onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
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
  if (!sawCompleted) throw new Error("Try-on stream ended before completion.");
}