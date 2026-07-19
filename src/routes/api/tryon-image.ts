import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Body = {
  imageDataUrl: string;
  outfitPrompt: string;
  outfitImageDataUrl?: string;
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

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        const token = authHeader.slice(7);
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response(
            JSON.stringify({ error: "Supabase not configured." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claimsData?.claims?.sub) {
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

        const prompt = [
          "Realistic virtual try-on.",
          body.outfitImageDataUrl
            ? "Image 1 is the person. Image 2 is the exact garment reference. Dress the person in image 1 with the EXACT clothing shown in image 2."
            : "Re-dress the person in the photo with the outfit described below.",
          "Strict rules:",
          "- Preserve the person's exact face, hairstyle, skin tone, body proportions, pose, and background from image 1.",
          "- Reproduce the garment(s) with the SAME colors, fabric textures, patterns, sleeves, collars, trousers, dress cut, shoes, and accessories as shown in the reference. Do NOT substitute or reinterpret the outfit.",
          "- Align garments naturally with the person's shoulders, torso, waist, and legs. Realistic lighting and shadows.",
          "- No text, no watermarks, no extra people, no background changes.",
          "",
          `Outfit description (for reference): ${body.outfitPrompt}`,
        ].join("\n");

        const userContent: Array<Record<string, unknown>> = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: body.imageDataUrl } },
        ];
        if (body.outfitImageDataUrl?.startsWith("data:image/")) {
          userContent.push({
            type: "image_url",
            image_url: { url: body.outfitImageDataUrl },
          });
        }

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
                  content: userContent,
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