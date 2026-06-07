import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Body = {
  imageDataUrl: string;
  outfitPrompt: string;
};

export const Route = createFileRoute("/api/tryon-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "LOVABLE_API_KEY is not configured." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        // Require an authenticated caller to prevent unbounded credit abuse.
        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        const token = authHeader.slice("Bearer ".length).trim();
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response(
            JSON.stringify({ error: "Auth is not configured." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!body?.imageDataUrl?.startsWith("data:image/") || !body?.outfitPrompt) {
          return new Response(
            JSON.stringify({ error: "imageDataUrl and outfitPrompt are required." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (body.outfitPrompt.length > 500) {
          return new Response(
            JSON.stringify({ error: "outfitPrompt must be 500 characters or fewer." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const prompt = [
          "Realistic virtual try-on. Re-dress the person in the photo with the outfit described below.",
          "Strict rules:",
          "- Preserve the person's exact face, hairstyle, skin tone, body proportions, pose, and background.",
          "- Only replace the clothing. Align garments with shoulders, torso, and waist naturally.",
          "- Photorealistic fabric, lighting, and shadows that match the original photo.",
          "- No text, no watermarks, no extra people.",
          "",
          `Outfit: ${body.outfitPrompt}`,
        ].join("\n");

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: body.imageDataUrl } },
                  ],
                },
              ],
              modalities: ["image", "text"],
              stream: true,
            }),
            signal: request.signal,
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({
              error: `Try-on generation failed (${upstream.status}): ${text.slice(0, 300)}`,
            }),
            { status: upstream.status, headers: { "Content-Type": "application/json" } },
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