import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { retrieveKnowledge } from "@/lib/rag.server";

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
    _ctx: ToolContext,
  ) => {
    const limit = input.limit ?? 5;
    let results: Awaited<ReturnType<typeof retrieveKnowledge>> = [];
    try {
      results = await retrieveKnowledge(input.query, limit, input.category);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Search failed: ${(e as Error).message}` }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text",
          text: results.length
            ? results
                .map(
                  (r) =>
                    `### ${r.title} (${r.category}) — ${(r.similarity * 100).toFixed(0)}% match\n${r.content?.slice(0, 400) ?? ""}${(r.content?.length ?? 0) > 400 ? "…" : ""}`,
                )
                .join("\n\n")
            : "No matching fashion knowledge found.",
        },
      ],
      structuredContent: { results },
    };
  },
});