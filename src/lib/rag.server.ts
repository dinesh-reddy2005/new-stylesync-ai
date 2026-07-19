import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const EMBED_MODEL = "openai/text-embedding-3-small"; // 1536 dims — matches vector(1536)

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embedding API ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vec = json?.data?.[0]?.embedding;
  if (!vec || !Array.isArray(vec)) throw new Error("No embedding returned");
  return vec;
}

function serverClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type KnowledgeHit = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string | null;
  source: string | null;
  similarity: number;
};

export async function retrieveKnowledge(
  query: string,
  k = 4,
  category?: string,
): Promise<KnowledgeHit[]> {
  const embedding = await embedText(query);
  const supabase = serverClient();
  // pgvector accepts JSON array string via the RPC
  const { data, error } = await supabase.rpc("match_fashion_knowledge", {
    query_embedding: JSON.stringify(embedding) as unknown as string,
    match_count: k,
    filter_category: category ?? undefined,
  });
  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return (data ?? []) as KnowledgeHit[];
}

export async function ingestPending(batchSize = 25): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  const admin = adminClient();
  const { data: rows, error } = await admin
    .from("fashion_knowledge_base")
    .select("id, title, content, keywords, category")
    .in("embedding_status", ["pending", "failed"])
    .limit(batchSize);
  if (error) throw new Error(error.message);

  let processed = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    try {
      const text = `${row.title}\n${row.category}\n${row.keywords ?? ""}\n\n${row.content}`;
      const embedding = await embedText(text);
      const { error: upErr } = await admin
        .from("fashion_knowledge_base")
        .update({
          embedding: JSON.stringify(embedding) as unknown as string,
          embedding_status: "processed",
        })
        .eq("id", row.id);
      if (upErr) throw upErr;
      processed++;
    } catch (e) {
      console.error("[rag] embed failed for", row.id, e);
      await admin
        .from("fashion_knowledge_base")
        .update({ embedding_status: "failed" })
        .eq("id", row.id);
      failed++;
    }
  }

  const { count } = await admin
    .from("fashion_knowledge_base")
    .select("id", { count: "exact", head: true })
    .in("embedding_status", ["pending", "failed"]);

  return { processed, failed, remaining: count ?? 0 };
}