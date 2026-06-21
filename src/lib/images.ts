// #3 — On-the-fly image optimization via Supabase Storage transformations.
// Returns a signed/public URL with width + format (default webp) applied at the edge.
import { supabase } from "@/integrations/supabase/client";

export interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  format?: "origin" | "webp" | "avif";
  resize?: "cover" | "contain" | "fill";
}

/**
 * Build an optimized public URL for a file in a public Supabase bucket.
 * Example: `optimizedImageUrl("service-images", "abc.jpg", { width: 320 })`
 */
export function optimizedImageUrl(
  bucket: string,
  path: string,
  t: ImageTransform = {},
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: {
      width: t.width,
      height: t.height,
      quality: t.quality ?? 75,
      format: t.format ?? "webp",
      resize: t.resize ?? "cover",
    },
  });
  return data.publicUrl;
}

/** Async variant for private buckets — returns a short-lived signed URL with transforms. */
export async function signedOptimizedImageUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600,
  t: ImageTransform = {},
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn, {
    transform: {
      width: t.width,
      height: t.height,
      quality: t.quality ?? 75,
      format: t.format ?? "webp",
      resize: t.resize ?? "cover",
    },
  });
  if (error || !data) return null;
  return data.signedUrl;
}