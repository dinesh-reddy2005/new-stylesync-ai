import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Body = { prompt: string };

export const Route = createFileRoute("/api/outfit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return json({ error: "LOVABLE_API_KEY is not configured." }, 500);
        }

        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) return json({ error: "Supabase not configured." }, 500);
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error } = await supabase.auth.getClaims(auth.slice(7));
        if (error || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON body." }, 400);
        }
        if (!body?.prompt || typeof body.prompt !== "string") {
          return json({ error: "prompt is required." }, 400);
        }

        const fullPrompt = `Editorial fashion product photograph of the following complete outfit laid out or worn by a faceless mannequin on a clean neutral studio background with soft lighting. Every garment must appear exactly as described with the correct color, fabric, and cut. No text, no watermarks, no logos. Outfit: ${body.prompt}`;

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image",
              messages: [{ role: "user", content: fullPrompt }],
              modalities: ["image", "text"],
              stream: true,
            }),
            signal: request.signal,
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return json(
            { error: `Image generation failed (${upstream.status}): ${text.slice(0, 300)}` },
            upstream.status,
          );
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}