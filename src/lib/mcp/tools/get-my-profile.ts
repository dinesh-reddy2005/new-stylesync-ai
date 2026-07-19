import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_my_profile",
  title: "Get my StyleSync profile",
  description: "Return the signed-in user's StyleSync AI profile (display name, avatar, email).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input: Record<string, never>, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const profile = {
      user_id: ctx.getUserId(),
      email: ctx.getUserEmail(),
      display_name: data?.display_name ?? null,
      avatar_url: data?.avatar_url ?? null,
      created_at: data?.created_at ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: profile,
    };
  },
});

// Silence unused zod import if tree-shaken; keeps types available for future fields.
void z;