"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { REFRESH_INTERVAL_MS } from "@/lib/config";
import { DEFAULT_GOALS, type GoalsConfig } from "@/lib/goals-shared";
import type { RevenuePayload, ViewsPayload } from "@/lib/types";
import { formatCompact, formatMoney, formatInt, timeAgo } from "@/lib/format";
import { dayOfMonth, daysInMonth, monthLabel } from "@/lib/month";
import GoalRow, { type Chip } from "./GoalRow";
import GoalEditor from "./GoalEditor";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

const ease = [0.16, 1, 0.3, 1] as const;

/** A short line that changes as a goal gets closer — the mirror talks back. */
function encouragement(pct: number): string {
  if (pct >= 100) return "objectif atteint — fixe le prochain";
  if (pct < 10) return "tout commence ici";
  if (pct < 25) return "l'élan se construit";
  if (pct < 50) return "le cap du quart est franchi";
  if (pct < 75) return "plus de la moitié du chemin";
  if (pct < 90) return "la ligne d'arrivée est en vue";
  return "derniers mètres — tout donner";
}

export default function Dashboard() {
  const [goals, setGoals] = useState<GoalsConfig>(DEFAULT_GOALS);
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
  const [views, setViews] = useState<ViewsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // Set after mount, refreshed every second: drives the clock and "timeAgo".
  const [now, setNow] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, rev, vw] = await Promise.all([
        fetchJson<GoalsConfig>("/api/goals"),
        fetchJson<RevenuePayload>("/api/revenue"),
        fetchJson<ViewsPayload>("/api/tiktok"),
      ]);
      setGoals(g);
      setRevenue(rev);
      setViews(vw);
      setLastSync(new Date().toISOString());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la synchronisation");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loading = !revenue && !views;
  const currency = revenue?.currency ?? goals.currency;

  const revPct = goals.revenueTarget > 0 ? Math.min(100, ((revenue?.total ?? 0) / goals.revenueTarget) * 100) : 0;
  const viewPct = goals.viewsTarget > 0 ? Math.min(100, ((views?.total ?? 0) / goals.viewsTarget) * 100) : 0;
  const overall = Math.round((revPct + viewPct) / 2);

  // Month context: day 2 of 31, 29 days left, etc.
  const day = dayOfMonth();
  const totalDays = daysInMonth();
  const month = monthLabel();

  const moneyChips: Chip[] = [];
  if (revenue?.mrr != null) moneyChips.push({ label: "MRR", value: formatMoney(revenue.mrr, currency) });
  if (revenue?.total != null)
    moneyChips.push({ label: "Rythme / jour", value: formatMoney(revenue.total / Math.max(1, day), currency) });

  const reachChips: Chip[] = [];
  if (views?.videoCount != null)
    reachChips.push({ label: "Vidéos ce mois-ci", value: formatInt(views.videoCount) });
  if (views?.total != null)
    reachChips.push({ label: "Rythme / jour", value: formatCompact(views.total / Math.max(1, day)) });

  const tickerItems = loading
    ? [goals.tagline]
    : [
        goals.tagline,
        `${month} — jour ${day} sur ${totalDays}, reste ${totalDays - day} jours`,
        `revenus ${Math.round(revPct)}% — ${encouragement(revPct)}`,
        `vues ${Math.round(viewPct)}% — ${encouragement(viewPct)}`,
        `global ${overall}% des deux objectifs du mois`,
        `mise à jour automatique toutes les ${Math.round(REFRESH_INTERVAL_MS / 1000)} s`,
      ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* ── Overall progress: a thin signal strip on the screen's top edge ── */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-white/[0.06]">
        <motion.div
          className="h-full bg-accent shadow-[0_0_10px_rgba(240,180,41,0.8)]"
          initial={{ width: 0 }}
          animate={{ width: `${overall}%` }}
          transition={{ duration: 1.4, ease, delay: 0.2 }}
        />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-10">
        {/* ── Masthead ──────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 py-4 sm:py-6"
        >
          <span className="font-display text-xl font-black uppercase tracking-[-0.01em] text-ink">
            {goals.team}
            <span className="text-accent">.</span>
          </span>
          <div className="flex items-center gap-4">
            <SyncBadge lastSync={lastSync} error={error} onRefresh={load} />
            <span className="tnum hidden font-mono text-xs text-ink-500 sm:inline" suppressHydrationWarning>
              {now
                ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : ""}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="border border-white/15 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-700 transition hover:border-accent/70 hover:text-accent active:scale-95"
            >
              modifier
            </button>
          </div>
        </motion.header>

        {/* ── Tagline ───────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 max-w-2xl text-balance text-sm italic text-ink-500 sm:text-base"
        >
          {goals.tagline}
        </motion.p>

        {/* ── The two figures ───────────────────────────────── */}
        <div className="flex flex-1 flex-col justify-center divide-y divide-white/10">
          <GoalRow
            label="Revenus"
            meta={`RevenueCat · ${month}${revenue?.estimated ? " · estimation" : ""}`}
            current={revenue?.total ?? 0}
            target={goals.revenueTarget}
            format={(n) => formatMoney(n, currency)}
            status={revenue?.status ?? "ok"}
            loading={loading}
            chips={moneyChips}
            delay={0.15}
          />

          <GoalRow
            label="Vues"
            meta={`TikTok · ${month}`}
            current={views?.total ?? 0}
            target={goals.viewsTarget}
            format={(n) => formatCompact(n)}
            status={views?.status ?? "ok"}
            loading={loading}
            chips={reachChips}
            delay={0.3}
          />
        </div>
      </main>

      {/* ── Stadium ticker ──────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="overflow-hidden border-t border-white/10 py-3"
        aria-hidden
      >
        <div className="marquee-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span
              key={i}
              className="whitespace-nowrap pr-12 font-mono text-xs uppercase tracking-[0.2em] text-ink-500"
            >
              {item} <span className="pl-12 text-accent">◆</span>
            </span>
          ))}
        </div>
      </motion.footer>

      <GoalEditor
        open={editing}
        goals={goals}
        onClose={() => setEditing(false)}
        onSaved={(next) => setGoals(next)}
      />
    </div>
  );
}

function SyncBadge({
  lastSync,
  error,
  onRefresh,
}: {
  lastSync: string | null;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <button
      onClick={onRefresh}
      className="inline-flex items-center gap-2 font-mono text-xs text-ink-500 transition hover:text-ink-700 active:scale-95"
      title="Actualiser"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-500" : "bg-emerald-400"}`} />
      <span className="tnum">
        {error ? "échec de synchro" : lastSync ? `synchro ${timeAgo(lastSync)}` : "synchronisation…"}
      </span>
    </button>
  );
}
