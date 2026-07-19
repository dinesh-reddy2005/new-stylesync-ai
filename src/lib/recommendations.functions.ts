import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProfileSchema = z.object({
  gender: z.string().optional(),
  bodyType: z.string().optional(),
  heightCm: z.number().optional(),
  skinTone: z.string().optional(),
  hairColor: z.string().optional(),
  faceShape: z.string().optional(),
  ageGroup: z.string().optional(),
  preferredFit: z.string().optional(),
  preferredColors: z.array(z.string()).optional(),
});

const FiltersSchema = z.object({
  occasion: z.string(),
  weather: z.string(),
  temperatureC: z.number(),
  season: z.string(),
  timeOfDay: z.string(),
  style: z.string(),
  trend: z.string(),
  location: z.string().optional(),
});

const InputSchema = z.object({
  profile: ProfileSchema,
  filters: FiltersSchema,
  excludeSignatures: z.array(z.string()).default([]),
  seed: z.number().int().default(0),
});

export type RecProfile = z.infer<typeof ProfileSchema>;
export type RecFilters = z.infer<typeof FiltersSchema>;

export type OutfitItem = {
  category: "Top" | "Bottom" | "Outerwear" | "Shoes" | "Accessory" | "Dress";
  name: string;
  color: string;
};

export type RawOutfit = {
  title: string;
  category: string;
  items: OutfitItem[];
  colorPalette: string[];
  imagePrompt: string;
  scores: {
    bodyMatch: number;
    occasionMatch: number;
    weatherMatch: number;
    stylePref: number;
    trendMatch: number;
  };
};

export type ScoredOutfit = RawOutfit & {
  confidence: number;
  signature: string;
};

const outfitTool = {
  type: "function" as const,
  function: {
    name: "report_outfit_recommendations",
    description:
      "Return a diverse ranked set of 12 outfit combinations personalized to the user profile and context filters.",
    parameters: {
      type: "object",
      properties: {
        outfits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description:
                  "Premium product-style outfit title, e.g. 'Classic Navy Linen Blazer Ensemble'.",
              },
              category: {
                type: "string",
                description: "Business, Smart Casual, Streetwear, Formal, Luxury Party, etc.",
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      enum: ["Top", "Bottom", "Outerwear", "Shoes", "Accessory", "Dress"],
                    },
                    name: {
                      type: "string",
                      description:
                        "Realistic premium product name, e.g. 'Premium Cotton Oxford Shirt'.",
                    },
                    color: { type: "string", description: "Named color, e.g. 'Ivory', 'Navy'." },
                  },
                  required: ["category", "name", "color"],
                },
              },
              colorPalette: {
                type: "array",
                items: { type: "string", description: "Hex color like #1a1a2e" },
              },
              imagePrompt: {
                type: "string",
                description:
                  "One detailed sentence describing the full outfit on a clean neutral studio background for image generation. Must name every garment, its exact color, fabric, and cut so a generator can reproduce it.",
              },
              scores: {
                type: "object",
                properties: {
                  bodyMatch: { type: "number", description: "0-100" },
                  occasionMatch: { type: "number", description: "0-100" },
                  weatherMatch: { type: "number", description: "0-100" },
                  stylePref: { type: "number", description: "0-100" },
                  trendMatch: { type: "number", description: "0-100" },
                },
                required: [
                  "bodyMatch",
                  "occasionMatch",
                  "weatherMatch",
                  "stylePref",
                  "trendMatch",
                ],
              },
            },
            required: [
              "title",
              "category",
              "items",
              "colorPalette",
              "imagePrompt",
              "scores",
            ],
          },
        },
      },
      required: ["outfits"],
    },
  },
};

function signatureOf(o: RawOutfit): string {
  return o.items
    .map((i) => `${i.category}:${i.color}:${i.name}`.toLowerCase())
    .sort()
    .join("|");
}

function computeConfidence(s: RawOutfit["scores"]): number {
  return Math.round(
    s.bodyMatch * 0.35 +
      s.occasionMatch * 0.25 +
      s.weatherMatch * 0.15 +
      s.stylePref * 0.15 +
      s.trendMatch * 0.1,
  );
}

export const generateOutfits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<{ outfits: ScoredOutfit[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured.");

    const { profile, filters, excludeSignatures, seed } = data;

    const system = `You are a senior AI fashion stylist for StyleSync AI. Generate exactly 12 diverse, personalized outfit combinations for the user.

PERSONALIZATION RULES:
- Body Type → silhouette: Athletic = slim-fit shirts, structured jackets, tapered trousers; Rectangle = layered outfits, straight-fit trousers, textured jackets; Pear = balanced silhouettes, dark bottoms, lighter tops; Hourglass = waist-defined garments, tailored dresses; Inverted Triangle = lighter tops, structured bottoms; Oval/Apple = vertical lines, longer tops.
- Skin tone → color palette: Warm = olive, cream, brown, rust, camel, terracotta; Cool = navy, black, white, grey, pastel blue, emerald; Neutral = any of the above.
- Preferred fit (Slim/Regular/Oversized) MUST be honored across all items.
- Respect gender and age group in silhouette and product naming.
- Every filter (occasion, weather/temperature, season, time of day, style, fashion trend, location) MUST inform the outfit. Weather + temperature dictates fabric and outerwear.

DIVERSITY:
- All 12 outfits MUST be materially different combinations. Vary silhouettes, palettes, and category mixes.
- Avoid duplicating the provided excluded signatures.
- Use premium product names (e.g. 'Classic Navy Linen Blazer', 'Premium Cotton Oxford Shirt', 'Relaxed Fit Beige Chinos', 'Urban Black Bomber Jacket', 'Signature White Leather Sneakers'). Never say 'oversized blazer' — say 'Oversized Charcoal Wool Blazer'.
- imagePrompt must be a single dense sentence usable directly by an image generator; it must enumerate every garment with its precise color and fabric so the render matches the item list exactly.

SCORING (0-100 each, be honest and vary them):
- bodyMatch: how well the silhouette flatters the user's body type and fit preference.
- occasionMatch: appropriateness for the exact occasion.
- weatherMatch: fitness for weather + temperature + season.
- stylePref: alignment with the user's preferred colors and style.
- trendMatch: how on-trend for the selected fashion trend.

Always call report_outfit_recommendations with all 12 outfits.`;

    const userMessage = {
      profile,
      filters,
      seed,
      excludeSignatures: excludeSignatures.slice(0, 40),
      note:
        "Return exactly 12 outfits ranked best-first. Each must be visibly different. Honor every filter and personalization rule.",
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userMessage) },
        ],
        tools: [outfitTool],
        tool_choice: {
          type: "function",
          function: { name: "report_outfit_recommendations" },
        },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[recommendations] Gemini API error", {
        status: res.status,
        body: t.slice(0, 2000),
      });
      throw new Error(
        `Recommendation engine failed (${res.status}). ${t.slice(0, 300) || "No response body."}`,
      );
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      console.error("[recommendations] Missing tool_calls in response", JSON.stringify(json).slice(0, 2000));
      throw new Error("Stylist did not return structured outfits.");
    }

    let parsed: { outfits: RawOutfit[] };
    try {
      parsed = JSON.parse(args) as { outfits: RawOutfit[] };
    } catch (e) {
      console.error("[recommendations] Failed to parse tool arguments", args);
      throw new Error("Stylist returned malformed outfit data.");
    }
    const exclude = new Set(excludeSignatures);

    const scored: ScoredOutfit[] = parsed.outfits
      .map((o) => ({
        ...o,
        signature: signatureOf(o),
        confidence: computeConfidence(o.scores),
      }))
      .filter((o) => !exclude.has(o.signature))
      .sort((a, b) => b.confidence - a.confidence);

    return { outfits: scored };
  });