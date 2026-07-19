import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { retrieveKnowledge } from "@/lib/rag.server";

export default defineTool({
  name: "get_stylist_advice",
  title: "Get AI stylist advice",
  description:
    "Ask StyleSync AI for personalized outfit or styling advice. Provide the situation (occasion, weather, body type, preferences) and get a fashion recommendation.",
  inputSchema: {
    prompt: z
      .string()
      .trim()
      .min(4)
      .max(2000)
      .describe("Describe the occasion, weather, body type, style preferences, or specific styling question."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ prompt }: { prompt: string }, _ctx: ToolContext) => {
    if (!_ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated. Sign in to use the AI stylist." }],
        isError: true,
      };
    }
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "AI is not configured (LOVABLE_API_KEY missing)." }],
        isError: true,
      };
    }
    // RAG: retrieve top fashion knowledge chunks to ground the advice.
    let ragContext = "";
    try {
      const hits = await retrieveKnowledge(prompt, 4);
      if (hits.length) {
        ragContext =
          "\n\nRelevant StyleSync knowledge base excerpts (use to ground your answer):\n" +
          hits
            .map((h, i) => `[${i + 1}] ${h.title} (${h.category}): ${h.content}`)
            .join("\n");
      }
    } catch (e) {
      console.warn("[stylist-advice] RAG retrieval skipped:", (e as Error).message);
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are StyleSync AI, a friendly expert fashion stylist. Give concrete, personalized outfit recommendations. Cover top, bottom, footwear, accessories, color palette, and a short reasoning. Keep it under 250 words. Use markdown." +
              ragContext,
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        content: [{ type: "text", text: `AI gateway error (${res.status}): ${text || "no body"}` }],
        isError: true,
      };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const advice = json?.choices?.[0]?.message?.content ?? "No advice generated.";
    return {
      content: [{ type: "text", text: advice }],
      structuredContent: { advice },
    };
  },
});