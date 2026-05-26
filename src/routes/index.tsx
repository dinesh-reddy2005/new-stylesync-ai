import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Camera, Wand2, Shirt, Ruler, TrendingUp, ArrowRight, Star } from "lucide-react";

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
              {["Streetwear", "Minimal", "Y2K", "Workwear", "Athleisure", "Evening"].map((s, i) => (
                <div key={s} className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-60"
                    style={{ background: `linear-gradient(135deg, oklch(0.4 0.25 ${280 + i * 15}), oklch(0.25 0.15 ${240 + i * 20}))` }} />
                  <div className="shimmer absolute inset-0 opacity-30" />
                  <div className="absolute bottom-3 left-3 text-xs font-medium">{s}</div>
                  <div className="absolute top-3 right-3 rounded-full glass px-2 py-0.5 text-[10px]">AI Pick</div>
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
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Trending this week</h2>
            <p className="mt-2 text-sm text-muted-foreground">Curated by AI from millions of looks.</p>
          </div>
          <Link to="/recommendations" className="text-sm text-fuchsia-300 hover:underline">See all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { t: "Quiet Luxury", h: 320 },
            { t: "Neo-Tokyo", h: 270 },
            { t: "Coastal Linen", h: 200 },
            { t: "Cyber Athleisure", h: 290 },
          ].map((item, i) => (
            <div key={item.t} className="glass overflow-hidden rounded-2xl border-white/10">
              <div className="relative aspect-[4/5]"
                style={{ background: `linear-gradient(160deg, oklch(0.35 0.22 ${item.h}), oklch(0.18 0.1 ${item.h + 40}))` }}>
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                  <Star className="h-3 w-3 text-yellow-300" /> {(4.6 + i * 0.1).toFixed(1)}
                </div>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">{item.t}</div>
                <div className="text-xs text-muted-foreground">AI confidence {88 + i * 2}%</div>
              </div>
            </div>
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
