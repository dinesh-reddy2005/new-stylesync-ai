import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

const CONFIG_HELP =
  "AI is not configured. Add a LOVABLE_API_KEY (Lovable AI Gateway) or GEMINI_API_KEY (direct Google AI Studio) in your project secrets.";

export const generateAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!lovableKey && !geminiKey) {
      throw new Error(CONFIG_HELP);
    }

    const systemPrompt =
      "You are StyleSync AI, a helpful creative assistant. Respond clearly and concisely using markdown when useful.";

    try {
      if (lovableKey) {
        return await callLovableGateway(lovableKey, systemPrompt, data.prompt);
      }
      return await callGeminiDirect(geminiKey!, systemPrompt, data.prompt);
    } catch (err) {
      // Re-throw known, user-friendly errors as-is
      if (err instanceof AIError) throw new Error(err.message);
      console.error("generateAI failed:", err);
      throw new Error(
        err instanceof Error
          ? `AI request failed: ${err.message}`
          : "AI request failed for an unknown reason.",
      );
    }
  });

class AIError extends Error {}

async function callLovableGateway(key: string, system: string, prompt: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new AIError(
      "Invalid or unauthorized LOVABLE_API_KEY. Rotate the key in project secrets and try again.",
    );
  }
  if (res.status === 429) {
    throw new AIError("Rate limit reached. Please try again in a moment.");
  }
  if (res.status === 402) {
    throw new AIError(
      "AI credits exhausted. Add credits in Settings → Workspace → Usage to continue.",
    );
  }
  if (!res.ok) {
    const text = await safeText(res);
    throw new AIError(`AI gateway error (${res.status}): ${text || "no body"}`);
  }

  const json = await res.json();
  const content: string =
    json?.choices?.[0]?.message?.content ?? "No response generated.";
  return { content, source: "lovable" as const };
}

async function callGeminiDirect(key: string, system: string, prompt: string) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { role: "system", parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (res.status === 400) {
    const text = await safeText(res);
    throw new AIError(
      `Gemini rejected the request. This usually means the GEMINI_API_KEY is malformed. Details: ${text || "no body"}`,
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new AIError(
      "Invalid GEMINI_API_KEY or it lacks access to the Generative Language API. Create a new key at https://aistudio.google.com/apikey and update the secret.",
    );
  }
  if (res.status === 429) {
    throw new AIError("Gemini rate limit reached. Please try again in a moment.");
  }
  if (!res.ok) {
    const text = await safeText(res);
    throw new AIError(`Gemini API error (${res.status}): ${text || "no body"}`);
  }

  const json = await res.json();
  const content: string =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ||
    "No response generated.";
  return { content, source: "gemini" as const };
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
