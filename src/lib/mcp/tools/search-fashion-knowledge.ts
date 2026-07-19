import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_fashion_knowledge",
  title: "Search StyleSync fashion knowledge",
  description:
    "Search the StyleSync AI fashion knowledge base (body analysis, outfits, color matching, styling guidance) by keyword.",
  inputSchema: {
    query: z.string().trim().min(2).max(200).describe("Keywords to search across titles, content, and keywords."),
    category: z.string().trim().min(1).max(80).optional().describe("Optional category filter, e.g. 'Body Analysis'."),
    limit: z.number().int().min(1).max(20).optional().describe("Max results to return (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    input: { query: string; category?: string; limit?: number },
    ctx: ToolContext,
  ) => {
    const limit = input.limit ?? 5;
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: ctx.getToken()
        ? { headers: { Authorization: `Bearer ${ctx.getToken()}` } }
        : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from("fashion_knowledge_base")
      .select("id, title, category, content, keywords, source")
      .or(
        `title.ilike.%${input.query}%,content.ilike.%${input.query}%,keywords.ilike.%${input.query}%`,
      )
      .limit(limit);
    if (input.category) q = q.eq("category", input.category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const results = data ?? [];
    return {
      content: [
        {
          type: "text",
          text: results.length
            ? results
                .map(
                  (r) =>
                    `### ${r.title} (${r.category})\n${r.content?.slice(0, 400) ?? ""}${(r.content?.length ?? 0) > 400 ? "…" : ""}`,
                )
                .join("\n\n")
            : "No matching fashion knowledge found.",
        },
      ],
      structuredContent: { results },
    };
  },
});