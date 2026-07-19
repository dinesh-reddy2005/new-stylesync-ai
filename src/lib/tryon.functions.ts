import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(20)
    .refine((v) => v.startsWith("data:image/"), "Must be a data URL"),
});

export type SizeCode = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type BodyTypeCode =
  | "Rectangle"
  | "Athletic"
  | "Inverted Triangle"
  | "Triangle"
  | "Oval"
  | "Trapezoid"
  | "Slim"
  | "Muscular";

export type BodyAnalysis = {
  shoulders: "narrow" | "average" | "broad";
  waist: "slim" | "average" | "wide";
  torso: "short" | "average" | "long";
  heightRatio: number; // head-to-body ratio, e.g. 7.6
  bodyType: BodyTypeCode;
  recommendedSize: SizeCode;
  fitStyle: string; // "Slim Fit" | "Regular Fit" | "Relaxed Fit" | ...
  confidence: number; // 0-100
  symmetryScore: number; // 0-100
  shoulderToWaist: number;
  waistToHip: number;
  /** Estimated proportional measurements in cm. */
  proportions: {
    heightCm: number;
    shoulderWidthCm: number;
    chestCm: number;
    waistCm: number;
    hipCm: number;
    torsoLengthCm: number;
    legLengthCm: number;
    armLengthCm: number;
  };
  /** Calculated fit percentages against the recommended size. */
  fit: {
    shoulderFit: number;
    chestFit: number;
    waistFit: number;
    sleeveLengthFit: number;
    garmentLengthFit: number;
    comfort: number;
  };
  reasoning: string;
  recommendation: string;
  /** Back-compat alias for older UI code. */
  measurements: {
    shoulderFit: number;
    waistFit: number;
    lengthFit: number;
    comfort: number;
  };
};

function getKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY is not configured.");
  return k;
}

const analysisTool = {
  type: "function" as const,
  function: {
    name: "report_body_analysis",
    description:
      "Report a detailed structured body analysis from a single full-body photo. Estimate real proportional measurements in cm from visible body landmarks (head, shoulders, chest, waist, hips, knees, ankles). Numbers must vary per person — never return template defaults.",
    parameters: {
      type: "object",
      properties: {
        shoulders: { type: "string", enum: ["narrow", "average", "broad"] },
        waist: { type: "string", enum: ["slim", "average", "wide"] },
        torso: { type: "string", enum: ["short", "average", "long"] },
        heightRatio: { type: "number", description: "Head-to-body ratio (heads), typical 6.5–8.0" },
        symmetryScore: { type: "number", description: "0-100 how symmetric the pose/body looks" },
        confidence: { type: "number", description: "0-100 confidence based on landmark visibility" },
        proportions: {
          type: "object",
          description: "Estimated real-world measurements in centimeters.",
          properties: {
            heightCm: { type: "number", description: "Estimated total height, ~150–200" },
            shoulderWidthCm: { type: "number", description: "Acromion-to-acromion, ~35–55" },
            chestCm: { type: "number", description: "Chest circumference estimate, ~78–125" },
            waistCm: { type: "number", description: "Natural waist circumference, ~60–115" },
            hipCm: { type: "number", description: "Hip circumference, ~75–125" },
            torsoLengthCm: { type: "number", description: "Shoulder to hip vertical, ~40–65" },
            legLengthCm: { type: "number", description: "Hip to ankle, ~75–115" },
            armLengthCm: { type: "number", description: "Shoulder to wrist, ~55–75" },
          },
          required: [
            "heightCm",
            "shoulderWidthCm",
            "chestCm",
            "waistCm",
            "hipCm",
            "torsoLengthCm",
            "legLengthCm",
            "armLengthCm",
          ],
          additionalProperties: false,
        },
        reasoning: { type: "string", description: "One sentence on the body-type call." },
      },
      required: [
        "shoulders",
        "waist",
        "torso",
        "heightRatio",
        "symmetryScore",
        "confidence",
        "proportions",
        "reasoning",
      ],
      additionalProperties: false,
    },
  },
};

/** Reference size chart used for fit% math (unisex-ish, cm). */
const SIZE_CHART: Record<
  SizeCode,
  { shoulder: number; chest: number; waist: number; hip: number; height: number; arm: number; torso: number }
> = {
  XS: { shoulder: 40, chest: 84, waist: 68, hip: 84, height: 160, arm: 57, torso: 44 },
  S: { shoulder: 43, chest: 92, waist: 74, hip: 92, height: 168, arm: 60, torso: 47 },
  M: { shoulder: 46, chest: 100, waist: 82, hip: 100, height: 175, arm: 62, torso: 49 },
  L: { shoulder: 48, chest: 108, waist: 90, hip: 108, height: 180, arm: 64, torso: 51 },
  XL: { shoulder: 51, chest: 116, waist: 98, hip: 116, height: 185, arm: 66, torso: 53 },
  XXL: { shoulder: 54, chest: 124, waist: 106, hip: 124, height: 190, arm: 68, torso: 55 },
};

function pickSize(p: {
  heightCm: number;
  shoulderWidthCm: number;
  chestCm: number;
  waistCm: number;
}): SizeCode {
  let best: SizeCode = "M";
  let bestScore = Infinity;
  (Object.keys(SIZE_CHART) as SizeCode[]).forEach((size) => {
    const c = SIZE_CHART[size];
    // weighted distance: chest & shoulder are strongest signals
    const d =
      Math.abs(p.chestCm - c.chest) * 1.0 +
      Math.abs(p.shoulderWidthCm - c.shoulder) * 1.5 +
      Math.abs(p.waistCm - c.waist) * 0.8 +
      Math.abs(p.heightCm - c.height) * 0.3;
    if (d < bestScore) {
      bestScore = d;
      best = size;
    }
  });
  return best;
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function classifyBodyType(p: {
  shoulderWidthCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
}): BodyTypeCode {
  const shoulderToWaist = p.shoulderWidthCm * 2.4 / p.waistCm; // scale shoulder width to circumference-ish
  const waistToHip = p.waistCm / p.hipCm;
  const chestToWaist = p.chestCm / p.waistCm;

  if (chestToWaist > 1.25 && shoulderToWaist > 1.15) return "Inverted Triangle";
  if (waistToHip < 0.82 && p.hipCm - p.chestCm > 4) return "Triangle";
  if (chestToWaist > 1.2 && waistToHip > 0.9) return "Muscular";
  if (chestToWaist > 1.15 && waistToHip < 0.95 && waistToHip > 0.82) return "Athletic";
  if (chestToWaist < 1.05 && waistToHip > 0.95 && p.waistCm > 90) return "Oval";
  if (chestToWaist >= 1.05 && chestToWaist <= 1.15 && waistToHip > 0.9) return "Trapezoid";
  if (p.chestCm < 88 && p.waistCm < 74) return "Slim";
  return "Rectangle";
}

function chooseFitStyle(bt: BodyTypeCode): string {
  switch (bt) {
    case "Athletic":
    case "Inverted Triangle":
    case "Muscular":
      return "Slim Fit";
    case "Rectangle":
    case "Slim":
      return "Regular Fit";
    case "Triangle":
      return "Tailored Fit";
    case "Oval":
      return "Relaxed Fit";
    case "Trapezoid":
      return "Regular Fit";
  }
}

function buildRecommendation(bt: BodyTypeCode, size: SizeCode, fitStyle: string): string {
  const base: Record<BodyTypeCode, string> = {
    Athletic:
      "Perfect fit for your body structure. Slim-fit shirts, tapered trousers, and structured jackets will complement your proportions. Avoid oversized garments that hide your shoulder definition.",
    "Inverted Triangle":
      "Emphasize your lower half with straight or slightly bootcut trousers and lighter bottoms. Avoid heavily padded shoulders — you already have strong upper body lines.",
    Rectangle:
      "Create visual definition with layered pieces, structured blazers, and belts at the waist. Textured fabrics and mid-rise trousers add welcome dimension.",
    Triangle:
      "Balance your silhouette with structured shoulders — blazers, epaulettes, and lighter tops paired with darker, straight-cut bottoms work beautifully.",
    Oval:
      "Choose relaxed, well-tailored pieces that skim the body — open collars, vertical patterns, and single-breasted jackets are your best friends.",
    Trapezoid:
      "You have naturally balanced proportions. Almost any modern cut works — lean into regular-fit shirts and slightly tapered trousers for a clean line.",
    Slim:
      "Add subtle volume with regular-fit shirts, layered outerwear, and slightly relaxed trousers. Avoid overly skinny cuts that emphasize a lean frame.",
    Muscular:
      "Stretch fabrics and slim-athletic cuts made for muscular builds will fit best. Avoid boxy silhouettes that compete with your shoulder-to-waist taper.",
  };
  return `${base[bt]} Recommended size: ${size} · ${fitStyle}.`;
}

export const analyzeBody = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<BodyAnalysis> => {
    const key = getKey();

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a computer-vision fashion fit analyst. Detect body landmarks (head, shoulders, chest, waist, hips, knees, ankles, wrists) in the photo and derive approximate proportional measurements in centimeters. Use the head-to-body ratio and visible landmark spacing to scale. Return ALL fields via report_body_analysis. Every measurement must be derived from THIS photo — never return generic template values, and never return the exact same numbers you would use for a different photo. If the photo is not full-body or landmarks are occluded, lower confidence accordingly.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Detect body landmarks and estimate this person's proportional measurements (shoulder width, chest, waist, hip, torso length, leg length, arm length, height) in centimeters. Provide head-to-body ratio, symmetry score, and confidence.",
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        tools: [analysisTool],
        tool_choice: { type: "function", function: { name: "report_body_analysis" } },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Body analysis failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!call) throw new Error("AI did not return a structured analysis.");

    const raw = JSON.parse(call) as {
      shoulders: "narrow" | "average" | "broad";
      waist: "slim" | "average" | "wide";
      torso: "short" | "average" | "long";
      heightRatio: number;
      symmetryScore: number;
      confidence: number;
      proportions: BodyAnalysis["proportions"];
      reasoning: string;
    };

    const p = raw.proportions;
    const size = pickSize(p);
    const chart = SIZE_CHART[size];
    const bodyType = classifyBodyType(p);
    const fitStyle = chooseFitStyle(bodyType);

    // Fit score = 100 - (measurement difference × scaling factor), clamped 0–100.
    const shoulderFit = clamp(100 - Math.abs(p.shoulderWidthCm - chart.shoulder) * 3);
    const chestFit = clamp(100 - Math.abs(p.chestCm - chart.chest) * 2);
    const waistFit = clamp(100 - Math.abs(p.waistCm - chart.waist) * 2);
    const sleeveLengthFit = clamp(100 - Math.abs(p.armLengthCm - chart.arm) * 4);
    const garmentLengthFit = clamp(100 - Math.abs(p.torsoLengthCm - chart.torso) * 4);
    const comfort = clamp(
      shoulderFit * 0.3 + chestFit * 0.3 + waistFit * 0.2 + garmentLengthFit * 0.2,
    );

    const shoulderToWaist = +(p.shoulderWidthCm * 2.4 / p.waistCm).toFixed(2);
    const waistToHip = +(p.waistCm / p.hipCm).toFixed(2);

    return {
      shoulders: raw.shoulders,
      waist: raw.waist,
      torso: raw.torso,
      heightRatio: raw.heightRatio,
      bodyType,
      recommendedSize: size,
      fitStyle,
      confidence: clamp(raw.confidence),
      symmetryScore: clamp(raw.symmetryScore),
      shoulderToWaist,
      waistToHip,
      proportions: p,
      fit: {
        shoulderFit,
        chestFit,
        waistFit,
        sleeveLengthFit,
        garmentLengthFit,
        comfort,
      },
      reasoning: raw.reasoning,
      recommendation: buildRecommendation(bodyType, size, fitStyle),
      measurements: {
        shoulderFit,
        waistFit,
        lengthFit: garmentLengthFit,
        comfort,
      },
    };
  });