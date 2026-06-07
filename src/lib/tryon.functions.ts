import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(20)
    .refine((v) => v.startsWith("data:image/"), "Must be a data URL"),
});

export type BodyAnalysis = {
  shoulders: "narrow" | "average" | "broad";
  waist: "slim" | "average" | "wide";
  torso: "short" | "average" | "long";
  heightRatio: number; // head-to-body ratio estimate, e.g. 7.2
  bodyType: string; // e.g. "rectangle", "athletic", "hourglass"
  recommendedSize: "XS" | "S" | "M" | "L" | "XL";
  confidence: number; // 0-100
  measurements: {
    shoulderFit: number;
    waistFit: number;
    lengthFit: number;
    comfort: number;
  };
  reasoning: string;
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
      "Report a structured body analysis from a single full-body photo for virtual try-on sizing.",
    parameters: {
      type: "object",
      properties: {
        shoulders: { type: "string", enum: ["narrow", "average", "broad"] },
        waist: { type: "string", enum: ["slim", "average", "wide"] },
        torso: { type: "string", enum: ["short", "average", "long"] },
        heightRatio: { type: "number", description: "Estimated head-to-body ratio, e.g. 7.2" },
        bodyType: { type: "string", description: "rectangle, athletic, hourglass, pear, etc." },
        recommendedSize: { type: "string", enum: ["XS", "S", "M", "L", "XL"] },
        confidence: { type: "number", description: "0-100" },
        measurements: {
          type: "object",
          properties: {
            shoulderFit: { type: "number" },
            waistFit: { type: "number" },
            lengthFit: { type: "number" },
            comfort: { type: "number" },
          },
          required: ["shoulderFit", "waistFit", "lengthFit", "comfort"],
          additionalProperties: false,
        },
        reasoning: {
          type: "string",
          description: "One sentence explaining why this size and outfit category fits.",
        },
      },
      required: [
        "shoulders",
        "waist",
        "torso",
        "heightRatio",
        "bodyType",
        "recommendedSize",
        "confidence",
        "measurements",
        "reasoning",
      ],
      additionalProperties: false,
    },
  },
};

export const analyzeBody = createServerFn({ method: "POST" })
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
              "You are a computer-vision fashion fit analyst. Given a single full-body photo of a person, infer approximate body proportions to recommend clothing size. Always call report_body_analysis. Be specific: estimate shoulder width, waist, torso length, height-to-head ratio, body type, and a confidence score. If the photo is not full-body, lower confidence accordingly.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this person's body proportions and recommend a clothing size with reasoning.",
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
    return JSON.parse(call) as BodyAnalysis;
  });