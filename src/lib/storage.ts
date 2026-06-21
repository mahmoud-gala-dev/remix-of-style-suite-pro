import { supabase } from "@/integrations/supabase/client";

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

export async function getAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteAvatar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}