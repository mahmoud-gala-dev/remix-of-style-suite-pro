import { supabase } from "@/integrations/supabase/client";
import type { ImageTransform } from "./images";

const BUCKET = "avatars";

function pathFor(userId: string, kind: "customer" | "employee", entityId: string, ext: string) {
  return `${userId}/${kind}/${entityId}.${ext}`;
}

export async function uploadAvatar(
  file: File,
  opts: { kind: "customer" | "employee"; entityId: string },
): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = pathFor(u.user.id, opts.kind, opts.entityId, ext);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getAvatarUrl(
  path: string | null | undefined,
  transform: ImageTransform = { width: 128, format: "webp", quality: 75 },
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60, {
    transform: {
      width: transform.width,
      height: transform.height,
      quality: transform.quality ?? 75,
      resize: transform.resize ?? "cover",
      format: (transform.format ?? "webp") as "origin",
    },
  });
  if (error) return null;
  return data.signedUrl;
}

export async function deleteAvatar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// P17 — Per-tenant uploads to dedicated buckets (customer-avatars, service-images).
// Path layout: <tenantId>/<entityId>.<ext> — RLS enforces auth; tenant scoping is via path.
type ImageBucket = "customer-avatars" | "service-images";

export async function uploadImage(
  bucket: ImageBucket,
  file: File,
  opts: { tenantId: string; entityId: string },
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${opts.tenantId}/${opts.entityId}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getImageUrl(
  bucket: ImageBucket,
  path: string | null | undefined,
  transform: ImageTransform = { width: 512, format: "webp", quality: 75 },
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60, {
    transform: {
      width: transform.width,
      height: transform.height,
      quality: transform.quality ?? 75,
      resize: transform.resize ?? "cover",
      format: (transform.format ?? "webp") as "origin",
    },
  });
  if (error) return null;
  return data.signedUrl;
}

export async function deleteImage(bucket: ImageBucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}