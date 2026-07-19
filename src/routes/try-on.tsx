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
  category: "Casual" | "Streetwear" | "Formal" | "Oversized" | "Smart Casual";
  image: string;
  prompt: string;
  aiPick?: boolean;
};

const OUTFITS: Outfit[] = [
  {
    id: "casual-linen",
    name: "Minimal Linen Set",
    category: "Casual",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    prompt:
      "a relaxed minimal linen outfit: cream short-sleeve linen shirt tucked into beige tailored linen trousers, soft natural fabric, casual everyday look",
    aiPick: true,
  },
  {
    id: "street-neo",
    name: "Neo Streetwear",
    category: "Streetwear",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    prompt:
      "neo streetwear: oversized black graphic tee, cargo pants with techwear straps, layered with a cropped utility vest, urban modern style",
  },
  {
    id: "formal-velvet",
    name: "Evening Velvet Suit",
    category: "Formal",
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
    prompt:
      "a sharply tailored midnight-blue velvet two-piece suit with satin lapels over a crisp white shirt, formal evening look",
  },
  {
    id: "oversized-cyber",
    name: "Oversized Cyber Hoodie",
    category: "Oversized",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
    prompt:
      "oversized futuristic cyber hoodie in deep charcoal with subtle neon piping, baggy wide-leg techwear pants, modern athleisure",
    aiPick: true,
  },
  {
    id: "smart-casual",
    name: "Smart Casual Layers",
    category: "Smart Casual",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    prompt:
      "smart casual: navy blazer over a fine knit crewneck, slim chinos, minimal leather sneakers, refined modern look",
  },
  {
    id: "casual-denim",
    name: "Everyday Denim",
    category: "Casual",
    image:
      "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80",
    prompt:
      "everyday casual: vintage washed denim jacket over a plain white tee, straight-leg jeans, white sneakers",
  },
  {
    id: "formal-tux",
    name: "Classic Black Tux",
    category: "Formal",
    image:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
    prompt:
      "classic black tuxedo with satin lapels, crisp white pleated shirt and black bow tie, formal black-tie look",
  },
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80";

function TryOn() {
  const analyzeFn = useServerFn(analyzeBody);
  const fileRef = useRef<HTMLInputElement>(null);

  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [selected, setSelected] = useState<Outfit | null>(null);

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
      await streamTryOn(originalDataUrl, outfit.prompt, (dataUrl, final) => {
        setPreviewSrc(dataUrl);
        if (final) setIsFinal(true);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Try-on generation failed.");
      setPreviewSrc(originalDataUrl);
      setIsFinal(true);
    } finally {
      setGenerating(false);
      setStatusText("");
    }
  }

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
            <h3 className="text-sm font-medium text-muted-foreground">Choose an outfit</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {OUTFITS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => generateTryOn(o)}
                  disabled={!originalDataUrl || analyzing || generating}
                  className={`group relative aspect-[3/4] overflow-hidden rounded-xl border text-left transition disabled:opacity-50 disabled:cursor-not-allowed bg-black/40 ${
                    selected?.id === o.id
                      ? "border-fuchsia-400 neon-border"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <img
                    src={o.image}
                    alt={o.name}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
                    }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {o.aiPick && (
                    <div className="absolute top-2 right-2 glass rounded-full px-2 py-0.5 text-[10px] font-medium text-fuchsia-200 border border-fuchsia-400/40">
                      AI Pick
                    </div>
                  )}
                  <div className="absolute top-2 left-2 glass rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/80 border border-white/10">
                    {o.category}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-xs font-medium text-white drop-shadow">
                    {o.name}
                  </div>
                  {selected?.id === o.id && generating && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
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
                {selected.category === "Oversized"
                  ? " — the relaxed cut adds visual volume while staying balanced."
                  : selected.category === "Formal"
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

async function streamTryOn(
  imageDataUrl: string,
  outfitPrompt: string,
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
    body: JSON.stringify({ imageDataUrl, outfitPrompt }),
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