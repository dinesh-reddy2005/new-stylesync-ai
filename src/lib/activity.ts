import { supabase } from "@/integrations/supabase/client";

export type GenerationType =
  | "recommendation"
  | "tryon"
  | "body_analysis"
  | "wardrobe"
  | "ai_studio";

export type ImageKind = "preview" | "tryon" | "outfit" | "wardrobe";

export type ProductItem = { name: string; color?: string; category?: string };

export type GenerationRow = {
  id: string;
  user_id: string;
  generation_type: GenerationType;
  prompt: string | null;
  occasion: string | null;
  weather: string | null;
  style: string | null;
  body_type: string | null;
  recommended_size: string | null;
  outfit_name: string | null;
  product_list: ProductItem[];
  color_palette: string[];
  tags: string[];
  confidence_score: number | null;
  image_url: string | null;
  image_status: "pending" | "ready" | "failed" | "none";
  result_text: string | null;
  metadata: Record<string, unknown>;
  is_favorite: boolean;
  is_saved: boolean;
  download_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
};

export type SavedOutfitRow = {
  id: string;
  user_id: string;
  generation_id: string | null;
  outfit_name: string;
  generation_type: string;
  image_url: string | null;
  image_status: string;
  confidence_score: number | null;
  product_list: ProductItem[];
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type UserStatistics = {
  user_id: string;
  total_generations: number;
  saved_looks: number;
  favorite_count: number;
  download_count: number;
  share_count: number;
  average_confidence: number;
};

export const BUCKET = "generations";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Create a history record for any user action. Returns the row id, or null if signed out. */
export async function logGeneration(input: {
  generationType: GenerationType;
  prompt?: string;
  occasion?: string;
  weather?: string;
  style?: string;
  bodyType?: string;
  recommendedSize?: string;
  outfitName?: string;
  productList?: ProductItem[];
  colorPalette?: string[];
  tags?: string[];
  confidenceScore?: number;
  resultText?: string;
  metadata?: Record<string, unknown>;
  imageStatus?: GenerationRow["image_status"];
}): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("user_generations")
    .insert({
      user_id: userId,
      generation_type: input.generationType,
      prompt: input.prompt ?? null,
      occasion: input.occasion ?? null,
      weather: input.weather ?? null,
      style: input.style ?? null,
      body_type: input.bodyType ?? null,
      recommended_size: input.recommendedSize ?? null,
      outfit_name: input.outfitName ?? null,
      product_list: (input.productList ?? []) as never,
      color_palette: (input.colorPalette ?? []) as never,
      tags: input.tags ?? [],
      confidence_score: input.confidenceScore ?? null,
      result_text: input.resultText ?? null,
      metadata: (input.metadata ?? {}) as never,
      image_status: input.imageStatus ?? "pending",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[activity] logGeneration", error.message);
    return null;
  }
  return data.id;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [header, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), ext: mime.split("/")[1] || "png" };
}

/** Upload a generated image and attach it to the generation record. */
export async function attachGenerationImage(
  generationId: string,
  kind: ImageKind,
  dataUrl: string,
): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  try {
    const { blob, ext } = dataUrlToBlob(dataUrl);
    const path = `${userId}/${generationId}-${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (upErr) throw upErr;

    await supabase
      .from("user_generations")
      .update({ image_url: path, image_status: "ready" })
      .eq("id", generationId);
    await supabase.from("generation_images").insert({
      user_id: userId,
      generation_id: generationId,
      kind,
      image_url: path,
      status: "ready",
    });
    return path;
  } catch (e) {
    await markImageFailed(generationId, kind, (e as Error).message);
    return null;
  }
}

export async function markImageFailed(
  generationId: string,
  kind: ImageKind,
  message: string,
) {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase
    .from("user_generations")
    .update({ image_status: "failed" })
    .eq("id", generationId);
  await supabase.from("generation_images").insert({
    user_id: userId,
    generation_id: generationId,
    kind,
    status: "failed",
    error_message: message.slice(0, 500),
  });
}

/** Turn stored storage paths into temporary viewable URLs. */
export async function resolveImageUrls(
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const unique = Array.from(
    new Set(paths.filter((p): p is string => !!p && !p.startsWith("http") && !p.startsWith("data:"))),
  );
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  data.forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

export async function saveGeneration(gen: GenerationRow): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const { error } = await supabase.from("saved_outfits").insert({
    user_id: userId,
    generation_id: gen.id,
    outfit_name: gen.outfit_name ?? "Untitled look",
    generation_type: gen.generation_type,
    image_url: gen.image_url,
    image_status: gen.image_status,
    confidence_score: gen.confidence_score,
    product_list: (gen.product_list ?? []) as never,
    tags: gen.tags ?? [],
    is_favorite: gen.is_favorite,
  });
  if (error) {
    console.error("[activity] saveGeneration", error.message);
    return false;
  }
  await supabase.from("user_generations").update({ is_saved: true }).eq("id", gen.id);
  return true;
}

export async function toggleFavoriteGeneration(
  generationId: string,
  next: boolean,
): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  if (next) {
    await supabase
      .from("favorite_outfits")
      .upsert({ user_id: userId, generation_id: generationId }, { onConflict: "user_id,generation_id" });
  } else {
    await supabase
      .from("favorite_outfits")
      .delete()
      .eq("user_id", userId)
      .eq("generation_id", generationId);
  }
  await supabase.from("user_generations").update({ is_favorite: next }).eq("id", generationId);
  await supabase.from("saved_outfits").update({ is_favorite: next }).eq("generation_id", generationId);
  return true;
}

export async function recordDownload(generationId: string, current: number) {
  await supabase
    .from("user_generations")
    .update({ download_count: current + 1 })
    .eq("id", generationId);
}

export async function recordShare(generationId: string, current: number) {
  await supabase
    .from("user_generations")
    .update({ share_count: current + 1 })
    .eq("id", generationId);
}

export async function deleteGeneration(id: string) {
  await supabase.from("user_generations").delete().eq("id", id);
}

export async function deleteSavedOutfit(id: string) {
  await supabase.from("saved_outfits").delete().eq("id", id);
}

/** Human relative timestamps: "Just now", "5 minutes ago", "Yesterday", "3 days ago". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function timeBucket(iso: string): "Today" | "Yesterday" | "Last week" | "Last month" | "Older" {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfToday - 86400000) return "Yesterday";
  if (t >= startOfToday - 7 * 86400000) return "Last week";
  if (t >= startOfToday - 30 * 86400000) return "Last month";
  return "Older";
}

export const TYPE_LABEL: Record<GenerationType, string> = {
  recommendation: "Recommendation",
  tryon: "Virtual Try-On",
  body_analysis: "Body Analysis",
  wardrobe: "Wardrobe Match",
  ai_studio: "AI Studio",
};

export async function downloadImage(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}