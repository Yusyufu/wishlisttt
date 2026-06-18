"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Trash2, RefreshCw, CheckCircle2, XCircle, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type LogEntry = {
  id: number;
  ts: number;
  level: "info" | "ok" | "err";
  msg: string;
};

const LOG: LogEntry[] = [];
let nextId = 0;

function log(level: LogEntry["level"], msg: string) {
  LOG.unshift({ id: nextId++, ts: Date.now(), level, msg });
  if (LOG.length > 50) LOG.length = 50;
  window.dispatchEvent(new CustomEvent("diagnostics:log"));
  // eslint-disable-next-line no-console
  console[level === "err" ? "error" : "log"](`[diag] ${msg}`);
}

export function Diagnostics({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, force] = useState(0);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const lastClickRef = useRef<number[]>([]);

  useEffect(() => {
    const onLog = () => force((n) => n + 1);
    window.addEventListener("diagnostics:log", onLog);
    return () => window.removeEventListener("diagnostics:log", onLog);
  }, []);

  useEffect(() => {
    if (open) refreshCount();
  }, [open]);

  const refreshCount = async () => {
    if (!supabase) {
      log("err", "Supabase not configured (env vars missing?)");
      return;
    }
    const { count, error } = await supabase
      .from("wishes")
      .select("id", { count: "exact", head: true });
    if (error) {
      log("err", `count failed: ${error.message}`);
      return;
    }
    setRowCount(count);
    log("ok", `row count = ${count}`);
  };

  /**
   * Full CRUD cycle against Supabase directly (bypasses React state),
   * so we can verify connectivity end-to-end without touching the UI.
   */
  const runSelfTest = async () => {
    if (!supabase) {
      log("err", "Supabase not configured");
      return;
    }
    setRunning(true);
    const TEST_ID = `selftest-${Date.now()}`;
    const TEST_TAB = "kino" as const;
    try {
      // CREATE
      log("info", "CREATE: inserting self-test row");
      const { error: insErr } = await supabase.from("wishes").insert({
        id: TEST_ID,
        tab: TEST_TAB,
        text: "self-test row",
        completed: false,
        story: "",
        image: null,
      });
      if (insErr) throw new Error(`insert: ${insErr.message}`);
      log("ok", "CREATE ok");

      // READ
      log("info", "READ: fetching self-test row");
      const { data: read, error: readErr } = await supabase
        .from("wishes")
        .select("*")
        .eq("id", TEST_ID)
        .single();
      if (readErr) throw new Error(`read: ${readErr.message}`);
      if (read.text !== "self-test row") throw new Error("read: data mismatch");
      log("ok", `READ ok (text="${read.text}")`);

      // UPDATE
      log("info", "UPDATE: marking completed");
      const { error: upErr } = await supabase
        .from("wishes")
        .update({ completed: true, story: "test story" })
        .eq("id", TEST_ID);
      if (upErr) throw new Error(`update: ${upErr.message}`);
      const { data: reread, error: reErr } = await supabase
        .from("wishes")
        .select("completed,story")
        .eq("id", TEST_ID)
        .single();
      if (reErr) throw new Error(`re-read: ${reErr.message}`);
      if (!reread.completed || reread.story !== "test story") {
        throw new Error("update: data not persisted");
      }
      log("ok", "UPDATE ok");

      // DELETE
      log("info", "DELETE: removing self-test row");
      const { error: delErr } = await supabase
        .from("wishes")
        .delete()
        .eq("id", TEST_ID);
      if (delErr) throw new Error(`delete: ${delErr.message}`);
      const { data: leftover } = await supabase
        .from("wishes")
        .select("id")
        .eq("id", TEST_ID);
      if (leftover && leftover.length > 0) throw new Error("delete: row still exists");
      log("ok", "DELETE ok");

      log("ok", "✅ ALL CRUD PASSED");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("err", `❌ FAILED: ${msg}`);
    } finally {
      setRunning(false);
      await refreshCount();
    }
  };

  const truncateAll = async () => {
    if (!supabase) return;
    if (!window.confirm("Delete ALL wishes in Supabase? This cannot be undone.")) return;
    log("info", "TRUNCATE: deleting all rows");
    const { error } = await supabase
      .from("wishes")
      .delete()
      .neq("id", "__never__");
    if (error) {
      log("err", `truncate failed: ${error.message}`);
    } else {
      log("ok", "truncate ok");
    }
    await refreshCount();
  };

  const clearLocal = () => {
    log("info", "localStorage no longer used in this build");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="diag"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:justify-end sm:p-6"
          onClick={onClose}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col border border-white/10 bg-neutral-950 font-mono text-[11px] text-neutral-300 shadow-2xl sm:rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.5} />
                <span className="uppercase tracking-widest text-neutral-400">Diagnostics</span>
              </div>
              <button onClick={onClose} aria-label="Close diagnostics" className="text-neutral-500 hover:text-white">
                <X className="h-4 w-4" strokeWidth={1.25} />
              </button>
            </div>

            {/* Status */}
            <div className="border-b border-white/10 px-3 py-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">Supabase</span>
                <span className={isSupabaseConfigured ? "text-green-400" : "text-red-400"}>
                  {isSupabaseConfigured ? "configured" : "missing env vars"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Row count</span>
                <span className="text-white">{rowCount ?? "—"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 px-3 py-2">
              <button
                onClick={refreshCount}
                disabled={running}
                className="flex items-center gap-1 border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-neutral-300 hover:border-white hover:text-white disabled:opacity-40"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={1.25} />
                Count
              </button>
              <button
                onClick={runSelfTest}
                disabled={running}
                className="flex items-center gap-1 border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-neutral-300 hover:border-white hover:text-white disabled:opacity-40"
              >
                <CheckCircle2 className="h-3 w-3" strokeWidth={1.25} />
                {running ? "Running…" : "Self-Test CRUD"}
              </button>
              <button
                onClick={clearLocal}
                className="flex items-center gap-1 border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-neutral-300 hover:border-white hover:text-white"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={1.25} />
                Clear Local
              </button>
              <button
                onClick={truncateAll}
                className="ml-auto flex items-center gap-1 border border-red-900/50 px-2 py-1 text-[10px] uppercase tracking-widest text-red-400 hover:border-red-500 hover:text-red-300"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.25} />
                Truncate
              </button>
            </div>

            {/* Log */}
            <div className="flex-1 overflow-auto px-3 py-2">
              {LOG.length === 0 ? (
                <p className="text-neutral-600">No operations yet.</p>
              ) : (
                LOG.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 border-b border-white/[0.03] py-1"
                  >
                    {entry.level === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-400" strokeWidth={1.5} />
                    ) : entry.level === "err" ? (
                      <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" strokeWidth={1.5} />
                    ) : (
                      <span className="mt-0.5 h-3 w-3 flex-shrink-0 text-neutral-500">•</span>
                    )}
                    <div className="flex-1 break-all">
                      <div className="text-neutral-500">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </div>
                      <div
                        className={
                          entry.level === "ok"
                            ? "text-green-300"
                            : entry.level === "err"
                            ? "text-red-300"
                            : "text-neutral-200"
                        }
                      >
                        {entry.msg}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Install a triple-tap (within 800ms) detector on the given element
 * to open the diagnostics panel.
 */
export function useTripleTap(open: () => void) {
  return (e: React.MouseEvent) => {
    const now = Date.now();
    const ref = (e.currentTarget as any).__tapRef ?? [];
    (e.currentTarget as any).__tapRef = ref;
    ref.push(now);
    while (ref.length > 0 && now - ref[0] > 800) ref.shift();
    if (ref.length >= 3) {
      ref.length = 0;
      open();
    }
  };
}
