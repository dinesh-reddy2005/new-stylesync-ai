import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // 1536 dims, matches column

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin role required.");
}

const EntryInputSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  content: z.string().min(1).max(20000),
  keywords: z.string().max(500).optional().nullable(),
  source: z.string().max(500).optional().nullable(),
});

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) {
      console.error("Embedding failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    return (json?.data?.[0]?.embedding as number[]) ?? null;
  } catch (e) {
    console.error("Embedding error:", e);
    return null;
  }
}

function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

// --- LIST + SEARCH (public reads via RLS) ---
export const listKnowledge = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.string().optional(),
        query: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("fashion_knowledge_base")
      .select("id, title, category, content, keywords, source, embedding_status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.category && data.category !== "All") q = q.eq("category", data.category);
    if (data.query && data.query.trim()) {
      const term = `%${data.query.trim()}%`;
      q = q.or(`title.ilike.${term},content.ilike.${term},keywords.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const knowledgeStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("fashion_knowledge_base")
    .select("category, embedding_status");
  if (error) throw new Error(error.message);
  const byCategory: Record<string, number> = {};
  let processed = 0;
  let pending = 0;
  let failed = 0;
  for (const r of data ?? []) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    if (r.embedding_status === "processed") processed++;
    else if (r.embedding_status === "failed") failed++;
    else pending++;
  }
  return { total: data?.length ?? 0, processed, pending, failed, byCategory };
});

// --- WRITES (require auth) ---
export const upsertKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    EntryInputSchema.extend({ id: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const textForEmbed = `${data.title}\n\n${data.content}\n\nKeywords: ${data.keywords ?? ""}`;
    const vector = await embed(textForEmbed);
    const payload = {
      title: data.title,
      category: data.category,
      content: data.content,
      keywords: data.keywords ?? null,
      source: data.source ?? null,
      embedding: vector ? toPgVector(vector) : null,
      embedding_status: vector ? "processed" : "pending",
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("fashion_knowledge_base")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("fashion_knowledge_base")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("fashion_knowledge_base")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reembedAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("fashion_knowledge_base")
      .select("id, title, content, keywords")
      .or("embedding_status.eq.pending,embedding_status.eq.failed");
    if (error) throw new Error(error.message);
    let processed = 0;
    let failed = 0;
    for (const row of data ?? []) {
      const text = `${row.title}\n\n${row.content}\n\nKeywords: ${row.keywords ?? ""}`;
      const vector = await embed(text);
      if (vector) {
        await supabaseAdmin
          .from("fashion_knowledge_base")
          .update({ embedding: toPgVector(vector), embedding_status: "processed" })
          .eq("id", row.id);
        processed++;
      } else {
        await supabaseAdmin
          .from("fashion_knowledge_base")
          .update({ embedding_status: "failed" })
          .eq("id", row.id);
        failed++;
      }
    }
    return { processed, failed };
  });

// --- RAG retrieval (semantic + keyword fallback) ---
export const retrieveContext = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        query: z.string().min(1).max(2000),
        category: z.string().optional(),
        topK: z.number().min(1).max(20).default(5),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const vector = await embed(data.query);
    if (vector) {
      const { data: rows, error } = await supabaseAdmin.rpc("match_fashion_knowledge", {
        query_embedding: toPgVector(vector),
        match_count: data.topK,
        filter_category: data.category ?? undefined,
      });
      if (!error && rows && rows.length > 0) {
        return { mode: "semantic" as const, results: rows };
      }
    }
    // Keyword fallback
    const term = `%${data.query.trim()}%`;
    let q = supabaseAdmin
      .from("fashion_knowledge_base")
      .select("id, title, category, content, keywords, source")
      .or(`title.ilike.${term},content.ilike.${term},keywords.ilike.${term}`)
      .limit(data.topK);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      mode: "keyword" as const,
      results: (rows ?? []).map((r) => ({ ...r, similarity: 0 })),
    };
  });