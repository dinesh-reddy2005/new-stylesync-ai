import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Star, Sparkles } from "lucide-react";
import outfit1 from "@/assets/outfit-1.jpg";
import outfit2 from "@/assets/outfit-2.jpg";
import outfit3 from "@/assets/outfit-3.jpg";
import outfit4 from "@/assets/outfit-4.jpg";

export const Route = createFileRoute("/recommendations")({
  component: Recs,
});

const occasions = ["Casual", "Work", "Date", "Party", "Travel", "Workout"];
const weathers = ["Sunny", "Rainy", "Cold", "Hot", "Mild"];
const styles = ["Minimal", "Streetwear", "Y2K", "Classic", "Bohemian", "Sporty"];

type Outfit = {
  name: string;
  pieces: string[];
  score: number;
  image: string;
  tags: string[];
};

function generate(occasion: string, weather: string, style: string): Outfit[] {
  const base: Outfit[] = [
    {
      name: `${style} ${occasion} Look`,
      pieces: ["Oversized blazer", "Cropped tee", "Wide-leg trousers", "Chunky loafers"],
      score: 94,
      image: outfit1,
      tags: [occasion, weather, style],
    },
    {
      name: `Neo ${occasion} Edit`,
      pieces: ["Sheer overlay", "High-waist denim", "Metallic belt", "Platform boots"],
      score: 91,
      image: outfit2,
      tags: [occasion, style, "Trending"],
    },
    {
      name: `${weather} ${style} Combo`,
      pieces: ["Knit cardigan", "Pleated skirt", "Knee boots", "Crossbody bag"],
      score: 88,
      image: outfit3,
      tags: [weather, style],
    },
    {
      name: `Statement ${occasion}`,
      pieces: ["Satin shirt", "Tailored shorts", "Sheer tights", "Pointed heels"],
      score: 86,
      image: outfit4,
      tags: [occasion, "Statement"],
    },
  ];
  return base;
}

function Recs() {
  const [occasion, setOccasion] = useState(occasions[0]);
  const [weather, setWeather] = useState(weathers[0]);
  const [style, setStyle] = useState(styles[0]);
  const [seed, setSeed] = useState(0);

  const results = useMemo(() => generate(occasion, weather, style), [occasion, weather, style, seed]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="text-center">
        <Badge className="glass border-white/10 text-fuchsia-300">Smart Outfit Recommendations</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          Outfits tailored <span className="text-gradient">to your moment</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Tell us the vibe — we'll generate looks based on occasion, weather, and trend signals.
        </p>
      </div>

      {/* Controls */}
      <Card className="glass-strong mt-10 border-white/10 p-5">
        <ChipGroup label="Occasion" options={occasions} value={occasion} onChange={setOccasion} />
        <ChipGroup label="Weather" options={weathers} value={weather} onChange={setWeather} />
        <ChipGroup label="Style" options={styles} value={style} onChange={setStyle} />
        <Button
          onClick={() => setSeed((s) => s + 1)}
          className="btn-glow mt-4 w-full bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90 sm:w-auto"
        >
          <Wand2 className="mr-2 h-4 w-4" /> Generate outfits
        </Button>
      </Card>

      {/* Results */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {results.map((o, i) => (
          <Card key={o.name + i + seed} className="glass group overflow-hidden border-white/10 transition hover:border-fuchsia-500/40 hover:-translate-y-1">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={o.image}
                alt={o.name}
                width={768}
                height={960}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                <Sparkles className="h-3 w-3 text-fuchsia-300" /> AI Pick
              </div>
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                <Star className="h-3 w-3 text-yellow-300" /> {o.score}
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm font-medium">{o.name}</div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {o.pieces.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1">
                {o.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Confidence</span>
                  <span>{o.score}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-fuchsia-500 to-blue-500" style={{ width: `${o.score}%` }} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
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