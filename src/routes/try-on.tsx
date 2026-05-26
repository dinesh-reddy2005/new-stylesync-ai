import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Upload, Wand2, Camera, Ruler, Sparkles, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/try-on")({
  component: TryOn,
});

const outfits = [
  { name: "Neo Streetwear Set", hue: 300, fit: 94 },
  { name: "Minimal Linen Suit", hue: 60, fit: 89 },
  { name: "Cyber Athleisure", hue: 240, fit: 91 },
  { name: "Evening Velvet", hue: 330, fit: 87 },
];

function TryOn() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPhoto(url);
    setAnalyzed(false);
  }

  function generate() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAnalyzed(true);
    }, 1400);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <Badge className="glass border-white/10 text-fuchsia-300">AI Virtual Try-On</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          See it on <span className="text-gradient">you</span> first
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Upload a full-body photo and our AI renders outfits with body-fit analysis.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Upload + preview */}
        <Card className="glass-strong border-white/10 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium flex items-center gap-2"><Camera className="h-4 w-4 text-fuchsia-300" /> Your photo</h2>
            {photo && (
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} className="text-muted-foreground">
                <RefreshCw className="mr-1 h-3 w-3" /> Replace
              </Button>
            )}
          </div>

          <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/30">
            {photo ? (
              <>
                <img src={photo} alt="Your upload" className="h-full w-full object-cover" />
                <div
                  className="absolute inset-0 mix-blend-screen transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.5 0.25 ${outfits[selected].hue} / 0.45), oklch(0.4 0.22 ${outfits[selected].hue + 40} / 0.3))`,
                  }}
                />
                {loading && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Generating try-on…</p>
                    </div>
                  </div>
                )}
                {analyzed && !loading && (
                  <div className="absolute bottom-3 left-3 right-3 glass rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Wearing</span>
                      <span className="font-medium">{outfits[selected].name}</span>
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

          <Button
            onClick={generate}
            disabled={!photo || loading}
            className="btn-glow mt-4 w-full bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {loading ? "Generating…" : "Generate Try-On"}
          </Button>
        </Card>

        {/* Controls */}
        <div className="space-y-6">
          <Card className="glass border-white/10 p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Choose an outfit</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {outfits.map((o, i) => (
                <button
                  key={o.name}
                  onClick={() => setSelected(i)}
                  className={`group relative aspect-square overflow-hidden rounded-xl border transition ${
                    selected === i ? "border-fuchsia-400 neon-border" : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ background: `linear-gradient(135deg, oklch(0.4 0.22 ${o.hue}), oklch(0.2 0.12 ${o.hue + 40}))` }}
                >
                  <div className="absolute bottom-2 left-2 right-2 text-left text-xs font-medium">{o.name}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="glass border-white/10 p-5">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ruler className="h-4 w-4" /> Body-Fit Analysis
            </h3>
            {analyzed ? (
              <div className="mt-4 space-y-4">
                <FitRow label="Shoulder fit" value={92} />
                <FitRow label="Waist fit" value={outfits[selected].fit} />
                <FitRow label="Length" value={88} />
                <FitRow label="Overall comfort" value={90} />
                <div className="rounded-xl glass-strong p-3 text-sm">
                  <span className="text-muted-foreground">Recommended size: </span>
                  <span className="font-medium text-fuchsia-300">M (regular)</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Generate a try-on to see size and fit insights.
              </p>
            )}
          </Card>

          <Card className="glass border-white/10 p-5">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-300" /> Styling intensity
            </h3>
            <Slider defaultValue={[60]} max={100} step={5} className="mt-4" />
            <p className="mt-2 text-xs text-muted-foreground">Subtle → Statement</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FitRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}