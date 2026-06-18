"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import {
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  CheckCircle2,
  Circle,
  ImagePlus,
  X,
  Camera,
  ChevronDown,
} from "lucide-react";
import { TABS, type TabId, type WishItem, type WishlistState } from "@/lib/types";
import { loadState, saveState, newId } from "@/lib/storage";
import { Dust } from "@/components/Dust";
import { PetalBurst } from "@/components/Petals";
import { MediaModal, type MediaItem } from "@/components/MediaModal";
import { Diagnostics, useTripleTap } from "@/components/Diagnostics";

type View = "list" | "gallery";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatCompletedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function Page() {
  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<TabId>("kino");
  const [items, setItems] = useState<WishlistState>({ kino: [], kita: [], vara: [] });
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [petalTrigger, setPetalTrigger] = useState(0);
  const [tabBurst, setTabBurst] = useState<{ id: number; x: number } | null>(null);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);
  const onHeartTripleTap = useTripleTap(() => setDiagOpen(true));

  const refresh = async () => {
    setHydrated(false);
    setLoadError(null);
    try {
      const state = await loadState();
      setItems(state);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setHydrated(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Persist any change to Supabase.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (loadError) return;
    if (items.kino.length === 0 && items.kita.length === 0 && items.vara.length === 0) {
      // Don't bother saving an empty state — would just churn.
      return;
    }
    setSaving(true);
    setSaveError(null);
    saveState(items)
      .then(() => {
        // eslint-disable-next-line no-console
        console.log("[supabase] save ok");
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        // eslint-disable-next-line no-console
        console.error("[supabase] save failed:", msg);
        setSaveError(msg);
      })
      .finally(() => setSaving(false));
  }, [items, hydrated, loadError]);

  const currentItems = items[activeTab];

  const galleryItems = useMemo(() => {
    const all = (Object.keys(items) as TabId[]).flatMap((tab) =>
      items[tab].map((it) => ({ ...it, tab }))
    );
    return all.filter(
      (it) => it.completed && (it.story.trim().length > 0 || it.image)
    );
  }, [items]);

  const updateItem = (
    tab: TabId,
    id: string,
    patch: Partial<WishItem>
  ) => {
    setItems((prev) => ({
      ...prev,
      [tab]: prev[tab].map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    const createdBy = activeTab === "kita" ? "kita" : activeTab;
    setItems((prev) => ({
      ...prev,
      [activeTab]: [
        ...prev[activeTab],
        {
          id: newId(),
          text,
          completed: false,
          expanded: false,
          story: "",
          image: null,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          completed_at: null,
        },
      ],
    }));
    setDraft("");
  };

  const removeItem = (tab: TabId, id: string) => {
    setItems((prev) => ({ ...prev, [tab]: prev[tab].filter((it) => it.id !== id) }));
  };

  const handleToggle = (id: string) => {
    const current = items[activeTab].find((i) => i.id === id);
    if (!current) return;
    const willComplete = !current.completed;
    if (willComplete) setPetalTrigger((t) => t + 1);
    updateItem(activeTab, id, {
      completed: willComplete,
      // Auto-open on completion, auto-close on uncheck
      expanded: willComplete,
      completed_at: willComplete ? new Date().toISOString() : null,
    });
  };

  const toggleExpand = (id: string) => {
    const current = items[activeTab].find((i) => i.id === id);
    if (!current) return;
    const willOpen = !current.expanded;
    setItems((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((it) =>
        it.id === id
          ? { ...it, expanded: willOpen }
          : // Close other expanded items in the same tab (single-open accordion).
            it.expanded ? { ...it, expanded: false } : it
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100">
      <Dust />

      <AnimatePresence>
        {!hydrated && <LoadingSplash />}
      </AnimatePresence>
      <AnimatePresence>
        {hydrated && loadError && <ErrorSplash message={loadError} onRetry={refresh} />}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col border-x border-neutral-900 shadow-[0_0_80px_-20px_rgba(255,255,255,0.06)] sm:max-w-lg">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255,255,255,0.04), transparent 60%)",
          }}
        />

        <Header
          view={view}
          onToggleView={() => setView((v) => (v === "list" ? "gallery" : "list"))}
          onHeartTripleTap={onHeartTripleTap}
          saving={saving}
          saveError={saveError}
        />

        <div className="relative z-10 flex-1 px-5 pb-24">
          <AnimatePresence mode="wait">
            {view === "list" ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Tabs
                  active={activeTab}
                  onChange={(t, x) => {
                    setActiveTab(t);
                    setTabBurst({ id: Date.now(), x });
                  }}
                />

                <InputBar value={draft} onChange={setDraft} onSubmit={addItem} />

                <motion.ul
                  layout
                  className="mt-2 flex flex-col"
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AnimatePresence initial={false}>
                    {currentItems.length === 0 ? (
                      <motion.li
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-16 text-center font-serif text-base italic text-neutral-600"
                      >
                        Nothing here yet — whisper a wish.
                      </motion.li>
                    ) : (
                      currentItems.map((item) => (
                        <WishRow
                          key={item.id}
                          item={item}
                          tab={activeTab}
                          onToggle={() => handleToggle(item.id)}
                          onToggleExpand={() => toggleExpand(item.id)}
                          onRemove={() => removeItem(activeTab, item.id)}
                          onStory={(story) =>
                            updateItem(activeTab, item.id, { story })
                          }
                          onAttachMedia={(dataUrl) =>
                            updateItem(activeTab, item.id, { image: dataUrl })
                          }
                          onDetachMedia={() =>
                            updateItem(activeTab, item.id, { image: null })
                          }
                          onOpenMedia={() => {
                            if (!item.image) return;
                            setModalItem({
                              src: item.image,
                              text: item.text,
                              story: item.story,
                              tabLabel: TABS.find((t) => t.id === activeTab)?.label,
                            });
                          }}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </motion.ul>

                <FooterMark />
              </motion.div>
            ) : (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Gallery
                  items={galleryItems}
                  onOpenMedia={(it) =>
                    setModalItem({
                      src: it.image!,
                      text: it.text,
                      story: it.story,
                      tabLabel: TABS.find((t) => t.id === it.tab)?.label,
                    })
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <TabBurst burst={tabBurst} />
      <PetalBurst trigger={petalTrigger} />
      <MediaModal item={modalItem} onClose={() => setModalItem(null)} />
      <Diagnostics open={diagOpen} onClose={() => setDiagOpen(false)} />
    </div>
  );
}

/* ----------------------------- Header ----------------------------- */

function Header({
  view,
  onToggleView,
  onHeartTripleTap,
  saving,
  saveError,
}: {
  view: View;
  onToggleView: () => void;
  onHeartTripleTap: (e: React.MouseEvent) => void;
  saving: boolean;
  saveError: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-md">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ display: "inline-flex" }}
          >
            {/* Heartbeat pulse */}
            <motion.span
              animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.12, 0.25, 0.4, 1],
              }}
              style={{ display: "inline-flex" }}
            >
              <Heart
                className="h-3.5 w-3.5 fill-white text-white"
                strokeWidth={1.25}
              />
            </motion.span>
          </motion.span>
          <h1 className="relative overflow-hidden font-serif text-[15px] font-medium uppercase tracking-[0.22em] text-white">
            <span className="relative z-10">Our Journey</span>
            {/* Shimmer sweep */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -skew-x-12"
              style={{
                background:
                  "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 6s linear infinite",
                mixBlendMode: "overlay",
              }}
            />
          </h1>
          <style jsx>{`
            @keyframes shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}</style>
        </div>
        <div className="flex items-center gap-2">
          {saveError ? (
            <span
              className="font-sans text-[9px] font-medium uppercase tracking-[0.25em] text-red-400"
              title={saveError}
            >
              Save failed
            </span>
          ) : saving ? (
            <span className="font-sans text-[9px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Saving…
            </span>
          ) : null}
        </div>
        <button
          aria-label={
            view === "list" ? "Switch to gallery view" : "Switch to list view"
          }
          onClick={onToggleView}
          className="group relative flex h-9 w-9 items-center justify-center border border-white/10 text-neutral-300 transition-all duration-500 hover:border-white/40 hover:text-white active:scale-95"
        >
          <AnimatePresence mode="wait" initial={false}>
            {view === "list" ? (
              <motion.span
                key="grid"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={1.25} />
              </motion.span>
            ) : (
              <motion.span
                key="img"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ImageIcon className="h-4 w-4" strokeWidth={1.25} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}

/* ----------------------------- Tabs ----------------------------- */

function Tabs({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId, x: number) => void;
}) {
  return (
    <LayoutGroup id="tabs">
      <nav className="mt-5 flex items-end gap-1 border-b border-white/[0.06]">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onChange(tab.id, rect.left + rect.width / 2);
              }}
              className="group relative flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2"
            >
              <span
                className={`font-serif text-xs uppercase tracking-[0.28em] transition-colors duration-500 ${
                  isActive ? "text-white" : "text-neutral-500 group-hover:text-neutral-300"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <>
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-[1.5px] bg-white"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                  {/* Soft glow under active tab */}
                  <motion.span
                    layoutId="tab-glow"
                    className="absolute -bottom-px left-1/2 h-[10px] w-2/3 -translate-x-1/2"
                    style={{
                      background:
                        "radial-gradient(ellipse at top, rgba(255,255,255,0.45), transparent 70%)",
                      filter: "blur(2px)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                </>
              )}
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

/* ----------------------------- Tab burst (click ripple) ----------------------------- */

function TabBurst({ burst }: { burst: { id: number; x: number } | null }) {
  return (
    <AnimatePresence>
      {burst && (
        <motion.span
          key={burst.id}
          aria-hidden
          initial={{ opacity: 0.6, scale: 0, x: burst.x - 30 }}
          animate={{ opacity: 0, scale: 4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="pointer-events-none fixed top-[78px] z-20 h-[60px] w-[60px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- Input ----------------------------- */

function InputBar({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3 border-b border-neutral-800 pb-3 transition-colors focus-within:border-neutral-500">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder="Tuliskan wishlist baru..."
        className="flex-1 bg-transparent font-sans text-[15px] font-light tracking-wide text-white placeholder:font-light placeholder:text-neutral-600 focus:outline-none"
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        className="group flex items-center gap-1.5 border border-white/15 px-3 py-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-300 transition-all duration-300 hover:border-white hover:text-white disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-700 disabled:hover:border-neutral-800 disabled:hover:text-neutral-700"
      >
        <Plus className="h-3 w-3" strokeWidth={1.5} />
        Add
      </button>
    </div>
  );
}

/* ----------------------------- Row ----------------------------- */

function WishRow({
  item,
  tab,
  onToggle,
  onToggleExpand,
  onRemove,
  onStory,
  onAttachMedia,
  onDetachMedia,
  onOpenMedia,
}: {
  item: WishItem;
  tab: TabId;
  onToggle: () => void;
  onToggleExpand: () => void;
  onRemove: () => void;
  onStory: (s: string) => void;
  onAttachMedia: (dataUrl: string) => void;
  onDetachMedia: () => void;
  onOpenMedia: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [storyFocused, setStoryFocused] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onAttachMedia(reader.result);
    };
    // Cap video reads at ~25MB to keep localStorage from blowing up.
    if (f.type.startsWith("video/") && f.size > 25 * 1024 * 1024) {
      alert("Video too large (max 25 MB). Please pick a shorter clip.");
      e.target.value = "";
      return;
    }
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const isVideo = item.image?.startsWith("data:video") ?? false;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative border-b border-white/[0.05]"
    >
      <div className="group flex items-start gap-3 py-4">
        <button
          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
          onClick={onToggle}
          className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-neutral-500 transition-all duration-500 hover:text-white active:scale-90"
        >
          {/* Ring pulse on complete */}
          {item.completed && (
            <motion.span
              aria-hidden
              initial={{ scale: 0.6, opacity: 0.6 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: "0 0 0 1px rgba(255,255,255,0.5)",
              }}
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            {item.completed ? (
              <motion.span
                key="checked"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <CheckCircle2
                  className="h-5 w-5 text-white"
                  strokeWidth={1.25}
                />
              </motion.span>
            ) : (
              <motion.span
                key="unchecked"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Circle className="h-5 w-5" strokeWidth={1.25} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="flex flex-1 items-start gap-3">
          <motion.p
            animate={{
              color: item.completed ? "#525252" : "#fafafa",
              opacity: item.completed ? 0.7 : 1,
            }}
            transition={{ duration: 0.5 }}
            className={`flex-1 font-serif text-[17px] leading-snug ${
              item.completed ? "line-through decoration-neutral-700" : ""
            }`}
          >
            {item.text}
          </motion.p>

          <button
            aria-label="Delete"
            onClick={onRemove}
            className="flex-shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5 text-neutral-600 hover:text-white" strokeWidth={1.25} />
          </button>

          <AnimatePresence>
            {item.completed && (
              <motion.button
                key="chevron"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
                onClick={onToggleExpand}
                aria-label={item.expanded ? "Collapse memory" : "Expand memory"}
                aria-expanded={item.expanded}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-neutral-500 transition-colors duration-300 hover:text-white"
              >
                <motion.span
                  animate={{ rotate: item.expanded ? 180 : 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex"
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Audit info: who created & when */}
      {item.created_by && (
        <div className="ml-8 pb-2">
          <span className="font-sans text-[8px] uppercase tracking-[0.2em] text-neutral-600">
            {item.created_by === "kita" ? "Kita" : item.created_by === "kino" ? "Kino" : "Vara"}
            {" · "}
            {formatDate(item.created_at)}
          </span>
          {item.completed && item.completed_at && (
            <span className="ml-2 font-sans text-[8px] uppercase tracking-[0.2em] text-neutral-700">
              ✓ {formatCompletedDate(item.completed_at)}
            </span>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {item.completed && item.expanded && (
          <motion.div
            key="memory"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.35, delay: 0.1 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 },
                opacity: { duration: 0.2 },
              },
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              exit={{ y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="ml-8 space-y-3 pb-5"
            >
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ scaleX: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="block h-px origin-left bg-gradient-to-r from-white/30 via-white/10 to-transparent"
              />
              <motion.textarea
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                value={item.story}
                onChange={(e) => onStory(e.target.value)}
                onFocus={() => setStoryFocused(true)}
                onBlur={() => setStoryFocused(false)}
                placeholder="Tuliskan memori atau cerita di balik ini..."
                rows={3}
                className={`w-full resize-none border bg-transparent p-3 font-serif text-[14px] italic leading-relaxed text-neutral-200 placeholder:font-light placeholder:italic placeholder:text-neutral-600 focus:outline-none transition-colors duration-500 ${
                  storyFocused ? "border-neutral-600" : "border-neutral-800"
                }`}
              />
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 border border-white/10 px-3 py-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-400 transition-all duration-300 hover:border-white/60 hover:text-white"
                >
                  <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.25} />
                  {item.image ? (isVideo ? "Replace Video" : "Replace Photo") : "Upload Photo / Video"}
                </button>

                <AnimatePresence>
                  {item.image && (
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={onOpenMedia}
                        className="group/thumb relative h-9 w-9 overflow-hidden border border-white/10 bg-black grayscale transition-all duration-500 hover:grayscale-0 focus:outline-none focus:ring-1 focus:ring-white/40"
                        aria-label="View media"
                      >
                        {isVideo ? (
                          <video
                            src={item.image}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.image ?? ""}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        {isVideo && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium uppercase tracking-widest text-white/80">
                            ▶
                          </span>
                        )}
                        <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/thumb:bg-black/20" />
                      </button>
                      <button
                        onClick={onDetachMedia}
                        className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 hover:text-white"
                      >
                        Remove
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ----------------------------- Gallery ----------------------------- */

function Gallery({
  items,
  onOpenMedia,
}: {
  items: (WishItem & { tab: TabId })[];
  onOpenMedia: (it: WishItem & { tab: TabId }) => void;
}) {
  return (
    <section className="pt-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="font-serif text-[10px] uppercase tracking-[0.4em] text-neutral-500">
          The Archive
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl italic text-neutral-500">
            No memories yet.
          </p>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.3em] text-neutral-700">
            Complete a wish to fill this room
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((it, i) => {
            const tab = TABS.find((t) => t.id === it.tab);
            const isVideo = it.image?.startsWith("data:video") ?? false;
            return (
              <motion.article
                key={`${it.tab}-${it.id}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  delay: i * 0.04,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() => onOpenMedia(it)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenMedia(it);
                  }
                }}
                className="group flex cursor-pointer flex-col focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/[0.06] bg-neutral-950">
                  {it.image ? (
                    isVideo ? (
                      <video
                        src={it.image}
                        className="absolute inset-0 h-full w-full object-cover grayscale transition-all duration-700 ease-out group-hover:grayscale-0 group-active:grayscale-0"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                        onTouchStart={(e) => e.currentTarget.play().catch(() => {})}
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.image}
                        alt={it.text}
                        className="absolute inset-0 h-full w-full object-cover grayscale transition-all duration-700 ease-out group-hover:grayscale-0 group-active:grayscale-0"
                      />
                    )
                  ) : (
                    <GothicPlaceholder seed={`${it.tab}-${it.id}`} />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <span className="absolute left-2 top-2 border border-white/15 bg-black/50 px-1.5 py-0.5 font-sans text-[8px] font-medium uppercase tracking-[0.3em] text-neutral-300 backdrop-blur-sm">
                    {tab?.sub}
                  </span>
                  {isVideo && (
                    <span className="absolute right-2 top-2 border border-white/20 bg-black/60 px-1.5 py-0.5 font-sans text-[8px] font-medium uppercase tracking-[0.3em] text-white backdrop-blur-sm">
                      Video
                    </span>
                  )}
                </div>
                {it.story && (
                  <p className="mt-2 line-clamp-2 font-serif text-[11px] italic leading-snug text-neutral-400">
                    “{it.story}”
                  </p>
                )}
              </motion.article>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="font-serif text-[9px] uppercase tracking-[0.5em] text-neutral-700">
          Infinitely Yours
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}

/* ----------------------------- Footer mark ----------------------------- */

function FooterMark() {
  return (
    <div className="mt-14 flex items-center gap-3">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="font-serif text-[9px] uppercase tracking-[0.5em] text-neutral-700">
        Infinitely Yours
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/* ----------------------------- Gothic placeholder ----------------------------- */

/**
 * Inline SVG placeholder for items without a media file.
 * Deterministic per-seed (so each card looks different) but 100% offline.
 */
function GothicPlaceholder({ seed }: { seed: string }) {
  const h = useMemo(() => {
    let v = 0;
    for (let i = 0; i < seed.length; i++) v = (v * 31 + seed.charCodeAt(i)) >>> 0;
    return v;
  }, [seed]);
  const angle = h % 360;
  const moonOffset = 20 + (h % 30);
  const tint = 8 + ((h >> 4) % 12);
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(${angle}deg, #0a0a0a 0%, #18181b 50%, #0a0a0a 100%)`,
      }}
    >
      <svg
        viewBox="0 0 100 140"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`m-${h}`} cx="50%" cy="40%" r="40%">
            <stop offset="0%" stopColor="rgba(232,230,225,0.35)" />
            <stop offset="100%" stopColor="rgba(232,230,225,0)" />
          </radialGradient>
          <filter id={`n-${h}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0.08 0"
            />
          </filter>
        </defs>
        {/* Moon */}
        <circle cx={moonOffset + 60} cy={30 + (h % 10)} r="14" fill={`url(#m-${h})`} />
        <circle cx={moonOffset + 60} cy={30 + (h % 10)} r="14" fill="none" stroke={`rgba(232,230,225,${0.15 + tint / 200})`} strokeWidth="0.3" />
        {/* Distant spires */}
        <path
          d="M0 110 L12 80 L18 90 L24 70 L30 88 L36 78 L44 92 L50 84 L58 95 L66 76 L74 90 L82 82 L90 92 L100 84 L100 140 L0 140 Z"
          fill={`rgba(${tint + 10},${tint + 10},${tint + 14},0.5)`}
        />
        {/* Foreground spires */}
        <path
          d="M0 140 L0 105 L10 95 L20 100 L28 88 L36 100 L44 92 L52 102 L62 90 L72 100 L80 96 L90 104 L100 100 L100 140 Z"
          fill={`rgba(${tint},${tint},${tint + 4},0.85)`}
        />
        {/* Noise grain */}
        <rect width="100" height="140" filter={`url(#n-${h})`} opacity="0.6" />
        {/* "NO IMAGE" label area */}
        <text
          x="50"
          y="125"
          textAnchor="middle"
          className="font-serif"
          fontSize="4"
          fill="rgba(232,230,225,0.45)"
          letterSpacing="2"
        >
          NO IMAGE
        </text>
      </svg>
    </div>
  );
}

/* ----------------------------- Loading splash ----------------------------- */

function ErrorSplash({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050505]/95 backdrop-blur-md"
    >
      <div className="max-w-xs px-6 text-center">
        <p className="font-serif text-lg italic text-neutral-300">
          Can’t reach the archive.
        </p>
        <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          {message}
        </p>
        <button
          onClick={onRetry}
          className="mt-6 border border-white/20 px-4 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-white transition-all duration-300 hover:border-white"
        >
          Retry
        </button>
      </div>
    </motion.div>
  );
}

function LoadingSplash() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]"
    >
      <div className="flex flex-col items-center gap-4">
        <motion.span
          animate={{ scale: [1, 1.2, 1, 1.15, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.12, 0.25, 0.4, 1],
          }}
        >
          <Heart className="h-5 w-5 fill-white text-white" strokeWidth={1.25} />
        </motion.span>
        <motion.span
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="font-serif text-[10px] uppercase tracking-[0.5em] text-neutral-400"
        >
          Loading
        </motion.span>
      </div>
    </motion.div>
  );
}

