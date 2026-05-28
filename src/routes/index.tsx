import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Camera, Wand2, Shirt, Ruler, TrendingUp, ArrowRight, Star, ArrowUpRight } from "lucide-react";
import streetwearImg from "@/assets/style-streetwear.jpg";
import minimalImg from "@/assets/style-minimal.jpg";
import y2kImg from "@/assets/style-y2k.jpg";
import formalImg from "@/assets/style-formal.jpg";
import casualImg from "@/assets/style-casual.jpg";
import aestheticImg from "@/assets/style-aesthetic.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const features = [
  { icon: Camera, title: "Virtual Try-On", desc: "Upload your photo and preview outfits instantly with realistic AI rendering." },
  { icon: Wand2, title: "Smart Recommendations", desc: "Get outfit ideas tailored to occasion, weather, and your personal style." },
  { icon: Ruler, title: "Body-Fit Analysis", desc: "AI sizing intelligence so what you order actually fits." },
  { icon: Shirt, title: "Wardrobe Matching", desc: "Mix and match what you already own with new trending pieces." },
  { icon: TrendingUp, title: "Trend Forecasts", desc: "Stay ahead with curated drops and runway-to-real-life styling." },
  { icon: Sparkles, title: "Confidence Score", desc: "Every outfit gets a confidence rating before you check out." },
];

const styleCards = [
  { title: "Streetwear", desc: "Bold urban layers with neon attitude.", image: streetwearImg, score: 96 },
  { title: "Minimal", desc: "Clean lines, neutral tones, quiet luxury.", image: minimalImg, score: 94 },
  { title: "Y2K", desc: "Metallic shine and futurist 2000s flair.", image: y2kImg, score: 92 },
  { title: "Formal", desc: "Sharp tailoring for elevated moments.", image: formalImg, score: 95 },
  { title: "Casual", desc: "Effortless everyday denim and basics.", image: casualImg, score: 90 },
  { title: "Aesthetic", desc: "Dreamy ethereal layers and soft tones.", image: aestheticImg, score: 93 },
];

function Index() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-fuchsia-400" /> Powered by next-gen AI fashion intelligence
        </div>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          Dress smarter with <br className="hidden md:block" />
          <span className="text-gradient">StyleSync AI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          Your personal AI stylist — virtual try-on, body-fit analysis, and outfit
          recommendations crafted for you in seconds.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90">
            <Link to="/try-on">Try On Virtually <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="glass border-white/10 hover:bg-white/5">
            <Link to="/recommendations">Get Outfit Ideas</Link>
          </Button>
        </div>

        {/* Hero visual */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="glass-strong neon-border animate-float rounded-3xl p-1">
            <div className="grid grid-cols-2 gap-3 rounded-[22px] bg-black/40 p-4 sm:grid-cols-3">
              {styleCards.map((s) => (
                <div key={s.title} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src={s.image}
                    alt={`${s.title} outfit`}
                    width={768}
                    height={960}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                    <Sparkles className="h-3 w-3 text-fuchsia-300" /> AI Pick
                  </div>
                  <div className="absolute bottom-3 left-3 text-left">
                    <div className="text-sm font-semibold">{s.title}</div>
                    <div className="hidden text-[10px] text-white/70 sm:block">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">A complete AI styling suite</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to shop with confidence.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="glass border-white/10 p-6 transition hover:border-fuchsia-500/30 hover:bg-white/5">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 border border-white/10">
                <f.icon className="h-5 w-5 text-fuchsia-300" />
              </div>
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Explore styles</h2>
            <p className="mt-2 text-sm text-muted-foreground">Curated by AI from millions of looks.</p>
          </div>
          <Link to="/recommendations" className="text-sm text-fuchsia-300 hover:underline">See all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {styleCards.map((s) => (
            <Card key={s.title} className="glass group overflow-hidden border-white/10 transition hover:border-fuchsia-500/40 hover:-translate-y-1">
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={s.image}
                  alt={`${s.title} style`}
                  width={768}
                  height={960}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                  <Sparkles className="h-3 w-3 text-fuchsia-300" /> AI Pick
                </div>
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                  <Star className="h-3 w-3 text-yellow-300" /> {s.score}
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
                <Link
                  to="/recommendations"
                  aria-label={`Explore ${s.title}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white transition group-hover:scale-110"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="glass-strong neon-border relative overflow-hidden rounded-3xl p-10 text-center md:p-16">
          <div className="absolute inset-0 -z-10 opacity-60"
            style={{ background: "radial-gradient(circle at 30% 20%, oklch(0.5 0.25 300 / 0.4), transparent 60%), radial-gradient(circle at 80% 70%, oklch(0.5 0.22 240 / 0.4), transparent 60%)" }} />
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Shop with <span className="text-gradient">zero doubt</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Let StyleSync AI style you for any occasion. Free to try.
          </p>
          <Button asChild size="lg" className="btn-glow mt-8 bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90">
            <Link to="/try-on">Launch Virtual Try-On</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
