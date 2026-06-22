import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insert rows into a Supabase table chosen at runtime.
 *
 * Supabase's typed `from()` requires a literal table name to infer row types;
 * admin/restore flows route across many tables dynamically, so a single, well-
 * documented `any` escape hatch is contained here. Callers get a typed Promise
 * back and don't need their own `as any` casts (debt #9, cycle #14).
 */
export async function insertDynamic(
  client: SupabaseClient,
  table: string,
  rows: unknown,
): Promise<{ error: { message: string } | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client.from(table as any) as any).insert(rows);
  return { error };
}