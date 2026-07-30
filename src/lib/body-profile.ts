import { supabase } from "@/integrations/supabase/client";
import type { BodyAnalysis } from "@/lib/tryon.functions";
import { BUCKET } from "@/lib/activity";

export type BodyProfile = {
  photoPath: string | null;
  photoHash: string | null;
  bodyType: string | null;
  heightCm: number | null;
  recommendedSize: string | null;
  fitStyle: string | null;
  skinTone: string | null;
  hairColor: string | null;
  faceShape: string | null;
  gender: string | null;
  analysis: BodyAnalysis | null;
  analyzedAt: string | null;
};

/** In-memory caches so a photo is never re-downloaded or re-hashed in a session. */
const photoCache = new Map<string, string>();
let profileCache: BodyProfile | null | undefined;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function hashDataUrl(dataUrl: string): Promise<string> {
  const body = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [header, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), ext: mime.split("/")[1] || "png" };
}

/** Read the stored body profile for the signed-in user (cached per session). */
export async function getBodyProfile(force = false): Promise<BodyProfile | null> {
  if (!force && profileCache !== undefined) return profileCache;
  const userId = await currentUserId();
  if (!userId) {
    profileCache = null;
    return null;
  }
  const { data, error } = await supabase
    .from("user_body_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    profileCache = null;
    return null;
  }
  profileCache = {
    photoPath: data.photo_path,
    photoHash: data.photo_hash,
    bodyType: data.body_type,
    heightCm: data.height_cm === null ? null : Number(data.height_cm),
    recommendedSize: data.recommended_size,
    fitStyle: data.fit_style,
    skinTone: data.skin_tone,
    hairColor: data.hair_color,
    faceShape: data.face_shape,
    gender: data.gender,
    analysis:
      data.analysis && Object.keys(data.analysis as object).length > 0
        ? (data.analysis as unknown as BodyAnalysis)
        : null,
    analyzedAt: data.analyzed_at,
  };
  return profileCache;
}

/** Download a stored photo and return it as a data URL (cached). */
export async function loadPhotoDataUrl(path: string): Promise<string | null> {
  const cached = photoCache.get(path);
  if (cached) return cached;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(data);
  });
  photoCache.set(path, dataUrl);
  return dataUrl;
}

/** Persist the user's photo. Returns the storage path, or null when signed out. */
export async function saveBodyPhoto(dataUrl: string, hash: string): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { blob, ext } = dataUrlToBlob(dataUrl);
  const path = `${userId}/body/photo-${hash}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) {
    console.error("[body-profile] upload", error.message);
    return null;
  }
  photoCache.set(path, dataUrl);
  const { error: upsertErr } = await supabase.from("user_body_profiles").upsert(
    { user_id: userId, photo_path: path, photo_hash: hash },
    { onConflict: "user_id" },
  );
  if (upsertErr) console.error("[body-profile] upsert photo", upsertErr.message);
  profileCache = undefined;
  return path;
}

/** Persist the one-time analysis of the stored photo. */
export async function saveBodyAnalysis(
  analysis: BodyAnalysis,
  hash: string,
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase.from("user_body_profiles").upsert(
    {
      user_id: userId,
      photo_hash: hash,
      body_type: analysis.bodyType,
      height_cm: analysis.proportions?.heightCm ?? null,
      recommended_size: analysis.recommendedSize,
      fit_style: analysis.fitStyle,
      skin_tone: analysis.skinTone ?? null,
      hair_color: analysis.hairColor ?? null,
      face_shape: analysis.faceShape ?? null,
      gender: analysis.apparentGender ?? null,
      landmarks: (analysis.landmarks ?? {}) as never,
      proportions: (analysis.proportions ?? {}) as never,
      analysis: analysis as never,
      analyzed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[body-profile] upsert analysis", error.message);
  profileCache = undefined;
}

export function clearBodyProfileCache() {
  profileCache = undefined;
}