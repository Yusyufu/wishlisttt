export type TabId = "kino" | "kita" | "vara";

export type WishItem = {
  id: string;
  text: string;
  completed: boolean;
  expanded: boolean;
  story: string;
  image: string | null;
};

export type WishlistState = Record<TabId, WishItem[]>;

export const TABS: { id: TabId; label: string; sub: string }[] = [
  { id: "kino", label: "Kino", sub: "HIS" },
  { id: "kita", label: "Kita Berdua", sub: "OURS" },
  { id: "vara", label: "Vara", sub: "HERS" },
];
