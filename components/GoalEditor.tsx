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
      if (!res.ok) throw new Error(data.error ?? `Échec de l'enregistrement (${res.status})`);
      sessionStorage.setItem(PW_KEY, password);
      onSaved(data as GoalsConfig);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
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
            aria-label="Modifier les objectifs"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="relative w-full max-w-lg border border-white/12 bg-[#101012] p-7"
          >
            <header className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-ink">
                  Modifier les objectifs
                </h2>
                <p className="mt-1 text-sm text-ink-400">
                  Objectifs du mois en cours — le suivi repart de zéro le 1er. Visibles par toute l'équipe.
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center text-ink-400 transition hover:bg-white/10 hover:text-ink"
                aria-label="Fermer"
              >
                ✕
              </button>
            </header>

            <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-4">
              <Field className="col-span-2" label="Nom de l'équipe">
                <input
                  ref={firstField}
                  value={form.team}
                  onChange={(e) => set("team", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field className="col-span-2" label="Slogan">
                <input
                  value={form.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Objectif de revenus (mois)">
                <input
                  type="number"
                  min={1}
                  value={form.revenueTarget}
                  onChange={(e) => set("revenueTarget", Number(e.target.value))}
                  className={`${inputCls} tnum`}
                />
              </Field>

              <Field label="Devise">
                <input
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                  maxLength={3}
                  className={`${inputCls} uppercase`}
                />
              </Field>

              <Field className="col-span-2" label="Objectif de vues (mois)">
                <input
                  type="number"
                  min={1}
                  value={form.viewsTarget}
                  onChange={(e) => set("viewsTarget", Number(e.target.value))}
                  className={`${inputCls} tnum`}
                />
              </Field>

              <Field className="col-span-2" label="Mot de passe">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe partagé de l'équipe"
                  className={inputCls}
                  autoComplete="current-password"
                />
              </Field>

              {error && (
                <p className="col-span-2 border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="col-span-2 mt-1 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-500 transition hover:text-ink"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-accent px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-accent-deep transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
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
  "w-full border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-400 focus:border-accent/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-accent/15";

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
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">{label}</span>
      {children}
    </label>
  );
}
