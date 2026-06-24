"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GoalsConfig } from "@/lib/goals-shared";

interface Props {
  open: boolean;
  goals: GoalsConfig;
  onClose: () => void;
  onSaved: (next: GoalsConfig) => void;
}

const PW_KEY = "charm.goals.pw";

export default function GoalEditor({ open, goals, onClose, onSaved }: Props) {
  const [form, setForm] = useState<GoalsConfig>(goals);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  // Re-seed the form whenever the modal opens with the latest live values.
  useEffect(() => {
    if (open) {
      setForm(goals);
      setError(null);
      setPassword(sessionStorage.getItem(PW_KEY) ?? "");
      setTimeout(() => firstField.current?.focus(), 60);
    }
  }, [open, goals]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof GoalsConfig>(key: K, value: GoalsConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      sessionStorage.setItem(PW_KEY, password);
      onSaved(data as GoalsConfig);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Edit goals"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="relative w-full max-w-lg rounded-[1.75rem] border border-white/10 bg-ink-900 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <header className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Edit goals
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  Changes go live for the whole team.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full px-2 py-1 text-white/40 transition hover:text-white/80"
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-4">
              <Field className="col-span-2" label="Team name">
                <input
                  ref={firstField}
                  value={form.team}
                  onChange={(e) => set("team", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field className="col-span-2" label="Tagline">
                <input
                  value={form.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Revenue objective">
                <input
                  type="number"
                  min={1}
                  value={form.revenueTarget}
                  onChange={(e) => set("revenueTarget", Number(e.target.value))}
                  className={`${inputCls} font-mono`}
                />
              </Field>

              <Field label="Currency">
                <input
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                  maxLength={3}
                  className={`${inputCls} font-mono uppercase`}
                />
              </Field>

              <Field label="Views target">
                <input
                  type="number"
                  min={1}
                  value={form.viewsTarget}
                  onChange={(e) => set("viewsTarget", Number(e.target.value))}
                  className={`${inputCls} font-mono`}
                />
              </Field>

              <Field label="Window (days)">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.windowDays}
                  onChange={(e) => set("windowDays", Number(e.target.value))}
                  className={`${inputCls} font-mono`}
                />
              </Field>

              <Field className="col-span-2" label="Edit password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Shared team password"
                  className={inputCls}
                  autoComplete="current-password"
                />
              </Field>

              {error && (
                <p className="col-span-2 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="col-span-2 mt-1 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm text-white/55 transition hover:text-white/90"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-ink-950 transition active:scale-[0.98] hover:bg-emerald-300 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save goals"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/50 focus:bg-white/[0.05]";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}
