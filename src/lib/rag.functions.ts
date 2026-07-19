import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ingestPendingKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batchSize: z.number().int().min(1).max(50).default(25) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { ingestPending } = await import("./rag.server");
    return ingestPending(data.batchSize);
  });

export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      query: z.string().trim().min(2).max(500),
      k: z.number().int().min(1).max(10).default(4),
      category: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { retrieveKnowledge } = await import("./rag.server");
    const hits = await retrieveKnowledge(data.query, data.k, data.category);
    return { hits };
  });