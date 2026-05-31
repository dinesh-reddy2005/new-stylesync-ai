import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { generateAI } from "@/lib/generate.functions";

export const Route = createFileRoute("/generate")({ component: GeneratePage });

const SUGGESTIONS = [
  "Design a capsule wardrobe for a Tokyo weekend trip",
  "Suggest a Y2K outfit for a rooftop party",
  "Write a product tagline for an AI stylist app",
  "Plan a minimalist work-from-home outfit rotation",
];

function GeneratePage() {
  const generate = useServerFn(generateAI);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const onGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Please enter a prompt first.");
      return;
    }
    setLoading(true);
    setOutput("");
    try {
      const res = await generate({ data: { prompt: trimmed } });
      setOutput(res.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-fuchsia-200 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> AI Studio
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Generate with <span className="text-gradient">StyleSync AI</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Describe what you need — outfits, captions, ideas. The AI will draft it for you in seconds.
        </p>
      </div>

      {/* Prompt card */}
      <Card className="glass-strong relative overflow-hidden border-white/10 p-5 md:p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative">
          <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Your prompt
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Build me a 5-piece minimalist autumn capsule with neutral tones…"
            className="mt-2 min-h-[140px] resize-none border-white/10 bg-black/30 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-fuchsia-400/40"
            disabled={loading}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                disabled={loading}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {prompt.length}/4000
            </span>
            <Button
              onClick={onGenerate}
              disabled={loading || !prompt.trim()}
              className="btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Output card */}
      <Card className="glass mt-6 border-white/10 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500/30 to-blue-500/30 ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              AI Response
            </h2>
          </div>
          <Button
            onClick={onCopy}
            disabled={!output || loading}
            size="sm"
            variant="outline"
            className="glass border-white/10 hover:bg-white/5"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 min-h-[180px] rounded-xl border border-white/10 bg-black/20 p-4">
          {loading ? (
            <LoadingShimmer />
          ) : output ? (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/90">
              {output}
            </pre>
          ) : (
            <div className="grid h-full place-items-center py-10 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                  <Wand2 className="h-5 w-5 text-fuchsia-300" />
                </div>
                <p className="mt-3 text-sm font-medium">No response yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter a prompt above and tap Generate.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function LoadingShimmer() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-fuchsia-300" />
        Thinking…
      </div>
      {[90, 78, 95, 60].map((w, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded-md bg-gradient-to-r from-white/5 via-white/15 to-white/5"
          style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
