import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "update_my_profile",
  title: "Update my StyleSync profile",
  description: "Update the signed-in user's display name and/or avatar URL on their StyleSync AI profile.",
  inputSchema: {
    display_name: z.string().trim().min(1).max(80).optional().describe("New display name."),
    avatar_url: z.string().url().optional().describe("New avatar image URL."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (
    input: { display_name?: string; avatar_url?: string },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    if (!input.display_name && !input.avatar_url) {
      return { content: [{ type: "text", text: "Provide display_name or avatar_url." }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = ctx.getUserId()!;
    const patch: Record<string, string> = {};
    if (input.display_name) patch.display_name = input.display_name;
    if (input.avatar_url) patch.avatar_url = input.avatar_url;
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select("display_name, avatar_url")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Profile updated: ${JSON.stringify(data)}` }],
      structuredContent: data ?? {},
    };
  },
});