import type { TabId, WishItem, WishlistState } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------- Supabase row helpers ------------------------- */

type Row = {
  id: string;
  tab: TabId;
  text: string;
  completed: boolean;
  story: string;
  image: string | null;
};

function emptyState(): WishlistState {
  return { kino: [], kita: [], vara: [] };
}

function rowsToState(rows: Row[]): WishlistState {
  const state = emptyState();
  for (const r of rows) {
    if (!state[r.tab]) state[r.tab] = [];
    state[r.tab].push({
      id: r.id,
      text: r.text,
      completed: r.completed,
      // Backwards-compat: older rows may not have `expanded` in the DB,
      // so default based on completed state.
      expanded: (r as any).expanded ?? r.completed,
      story: r.story ?? "",
      image: r.image,
    });
  }
  return state;
}

function stateToRows(state: WishlistState): Row[] {
  return (Object.keys(state) as TabId[]).flatMap((tab) =>
    state[tab].map((it) => ({ ...it, tab }))
  );
}

/* ------------------------- Public API ------------------------- */

/**
 * Load wishlist from Supabase (single source of truth).
 * Throws if Supabase is unreachable or returns an error.
 */
export async function loadState(): Promise<WishlistState> {
  if (!supabase) {
    throw new Error("Supabase not configured (missing env vars)");
  }
  const result = await Promise.race([
    supabase.from("wishes").select("*").order("updated_at", { ascending: true }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("supabase timeout")), 8000)
    ),
  ]);
  const { data, error } = result as {
    data: Row[] | null;
    error: { message: string } | null;
  };
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return emptyState();
  return rowsToState(data);
}

/**
 * Push the full state to Supabase (upsert + delete missing).
 */
export async function saveState(state: WishlistState): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase not configured (missing env vars)");
  }

  const rows = stateToRows(state);
  const { error: upErr } = await supabase
    .from("wishes")
    .upsert(rows, { onConflict: "id" });
  if (upErr) throw new Error(upErr.message);

  const ids = rows.map((r) => r.id);
  const { data: existing, error: selErr } = await supabase
    .from("wishes")
    .select("id");
  if (selErr) throw new Error(selErr.message);
  const toDelete = (existing ?? [])
    .map((r) => r.id)
    .filter((id) => !ids.includes(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("wishes")
      .delete()
      .in("id", toDelete);
    if (delErr) throw new Error(delErr.message);
  }
}

/**
 * Delete a single wish by id (used by diagnostics for self-tests).
 */
export async function deleteOne(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("wishes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
