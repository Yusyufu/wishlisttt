"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export type MediaItem = {
  src: string;
  text: string;
  story: string;
  tabLabel?: string;
};

export function MediaModal({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}) {
  // ESC to close
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (item) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [item]);

  const isVideo = item?.src.startsWith("data:video") ?? false;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              aria-label="Close"
              onClick={onClose}
              className="absolute -top-2 right-0 z-20 flex h-9 w-9 items-center justify-center text-white/70 transition-all duration-300 hover:text-white active:scale-90 sm:-right-12 sm:-top-2"
            >
              <X className="h-5 w-5" strokeWidth={1.25} />
            </button>

            {/* Media frame */}
            <div className="relative overflow-hidden border border-white/10 bg-black">
              {isVideo ? (
                <video
                  src={item.src}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.src}
                  alt={item.text}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>

            {/* Caption */}
            {(item.text || item.story) && (
              <div className="mt-3 border-t border-white/10 pt-3">
                {item.tabLabel && (
                  <span className="font-sans text-[9px] font-medium uppercase tracking-[0.4em] text-neutral-500">
                    {item.tabLabel}
                  </span>
                )}
                {item.text && (
                  <p className="mt-1 font-serif text-base leading-snug text-white">
                    {item.text}
                  </p>
                )}
                {item.story && (
                  <p className="mt-2 font-serif text-sm italic leading-relaxed text-neutral-300">
                    “{item.story}”
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
