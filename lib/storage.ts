import type { TabId, WishItem, WishlistState } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

/* ------------------------- Dummy / fallback seed ------------------------- */

export const INITIAL_STATE: WishlistState = {
  kino: [
    { id: "seed-k1", text: "Nonton live Pierce the Veil di barisan paling depan", completed: false, expanded: false, story: "", image: null },
    { id: "seed-k2", text: "Lengkapi koleksi vinyl Saosin", completed: false, expanded: false, story: "", image: null },
  ],
  kita: [
    {
      id: "seed-b1",
      text: "Co-op main Elden Ring / Dark Souls berdua sampai namatin DLC-nya",
      completed: true,
      expanded: true,
      story: "Mati puluhan kali lawan boss, tapi akhirnya menang juga malam ini.",
      image: null,
    },
    { id: "seed-b2", text: "Tattoo bareng dengan desain minimalist gothic", completed: false, expanded: false, story: "", image: null },
  ],
  vara: [
    { id: "seed-v1", text: "Bikin matching DIY chain bracelet & necklace berdua", completed: false, expanded: false, story: "", image: null },
  ],
};

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------- localStorage (offline cache) ------------------------- */

const LS_KEY = "our-journey:v1";

function lsRead(): WishlistState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WishlistState;
    // Backfill `expanded` for items written by older versions.
    for (const tab of Object.keys(parsed) as TabId[]) {
      parsed[tab] = (parsed[tab] ?? []).map((it) => ({
        ...it,
        expanded: it.expanded ?? it.completed,
      }));
    }
    return parsed;
  } catch {
    return null;
  }
}

function lsWrite(state: WishlistState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

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
 * Load wishlist. Order of resolution:
 * 1. Supabase (if configured) — source of truth
 * 2. localStorage cache (offline / first-visit fallback)
 * 3. INITIAL_STATE (seed) — only when nothing exists anywhere
 */
export async function loadState(): Promise<WishlistState> {
  if (supabase) {
    try {
      const result = await Promise.race([
        supabase.from("wishes").select("*").order("updated_at", { ascending: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("supabase timeout")), 5000)
        ),
      ]);
      const { data, error } = result as {
        data: Row[] | null;
        error: { message: string } | null;
      };
      if (error) {
        console.warn("[supabase] load error, falling back to local:", error.message);
      } else if (data && data.length > 0) {
        const state = rowsToState(data);
        lsWrite(state);
        return state;
      }
    } catch (e) {
      console.warn("[supabase] load failed, falling back to local:", e);
    }
  }
  const cached = lsRead();
  if (cached) return cached;
  return INITIAL_STATE;
}

/**
 * Push the full state to Supabase (upsert + delete missing).
 * Also mirrors to localStorage for offline reads.
 */
export async function saveState(state: WishlistState): Promise<void> {
  lsWrite(state);
  if (!supabase) return;

  const rows = stateToRows(state);
  // Upsert all current rows
  const { error: upErr } = await supabase
    .from("wishes")
    .upsert(rows, { onConflict: "id" });
  if (upErr) {
    console.error("[supabase] upsert failed:", upErr.message);
    return;
  }

  // Delete rows that no longer exist
  const ids = rows.map((r) => r.id);
  const { data: existing, error: selErr } = await supabase
    .from("wishes")
    .select("id");
  if (selErr) return;
  const toDelete = (existing ?? [])
    .map((r) => r.id)
    .filter((id) => !ids.includes(id));
  if (toDelete.length > 0) {
    await supabase.from("wishes").delete().in("id", toDelete);
  }
}
