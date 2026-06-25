"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { REFRESH_INTERVAL_MS } from "@/lib/config";
import { DEFAULT_GOALS, type GoalsConfig } from "@/lib/goals-shared";
import type { RevenuePayload, ViewsPayload } from "@/lib/types";
import { formatCompact, formatMoney, formatInt, timeAgo } from "@/lib/format";
import GoalDial, { type Chip } from "./GoalDial";
import GoalEditor from "./GoalEditor";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function Dashboard() {
  const [goals, setGoals] = useState<GoalsConfig>(DEFAULT_GOALS);
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
  const [views, setViews] = useState<ViewsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [, forceTick] = useState(0);

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
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loading = !revenue && !views;
  const currency = revenue?.currency ?? goals.currency;

  // A single combined "how are we doing" figure for the header.
  const revPct = goals.revenueTarget > 0 ? Math.min(100, ((revenue?.total ?? 0) / goals.revenueTarget) * 100) : 0;
  const viewPct = goals.viewsTarget > 0 ? Math.min(100, ((views?.total ?? 0) / goals.viewsTarget) * 100) : 0;
  const overall = Math.round((revPct + viewPct) / 2);

  const moneyChips: Chip[] = [];
  if (revenue?.mrr != null) moneyChips.push({ label: "MRR", value: formatMoney(revenue.mrr, currency) });
  if (revenue?.trailing28 != null)
    moneyChips.push({ label: "28 derniers jours", value: formatMoney(revenue.trailing28, currency) });

  const reachChips: Chip[] = [];
  if (views?.videoCount != null)
    reachChips.push({ label: "Vidéos", value: formatInt(views.videoCount) });
  if (views?.total != null)
    reachChips.push({ label: `Moy. / vidéo`, value: formatCompact(views.videoCount ? views.total / views.videoCount : 0) });

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 py-7 sm:px-8 sm:py-10">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <CharmMark />
          <span className="font-display text-lg font-bold tracking-tight text-ink">{goals.team}</span>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge lastSync={lastSync} error={error} onRefresh={load} />
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-sm font-medium text-ink-700 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/[0.09] active:scale-95"
          >
            <PencilIcon />
            Modifier les objectifs
          </button>
        </div>
      </motion.header>

      {/* ── Hero: tagline + overall progress ────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05, ease }}
        className="mt-9 sm:mt-12"
      >
        <h1 className="max-w-2xl text-balance font-display text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.2rem]">
          {goals.tagline}
        </h1>
        <div className="mt-5 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-money via-sky-400 to-reach shadow-[0_0_12px_rgba(99,102,241,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${overall}%` }}
              transition={{ duration: 1.4, ease, delay: 0.2 }}
            />
          </div>
          <span className="tnum text-sm font-semibold text-ink-700">
            {loading ? "—" : `${overall}% des deux objectifs`}
          </span>
        </div>
      </motion.div>

      {/* ── The two dials ───────────────────────────────────── */}
      <div className="mt-9 grid flex-1 grid-cols-1 content-center gap-5 py-2 md:grid-cols-2 sm:mt-10">
        <GoalDial
          accent="money"
          icon="money"
          label="Revenus"
          meta="via RevenueCat"
          current={revenue?.total ?? 0}
          target={goals.revenueTarget}
          format={(n) => formatMoney(n, currency)}
          status={revenue?.status ?? "ok"}
          loading={loading}
          chips={moneyChips}
          delay={0.1}
        />

        <GoalDial
          accent="reach"
          icon="reach"
          label="Vues"
          meta={`TikTok · ${goals.windowDays} derniers jours`}
          current={views?.total ?? 0}
          target={goals.viewsTarget}
          format={(n) => formatCompact(n)}
          status={views?.status ?? "ok"}
          loading={loading}
          chips={reachChips}
          delay={0.2}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 flex items-center justify-between text-xs text-ink-400"
      >
        <span>Mise à jour automatique toutes les {Math.round(REFRESH_INTERVAL_MS / 1000)} secondes</span>
        <span>{goals.team}</span>
      </motion.footer>

      <GoalEditor
        open={editing}
        goals={goals}
        onClose={() => setEditing(false)}
        onSaved={(next) => setGoals(next)}
      />
    </main>
  );
}

/** A small rounded gradient sparkle — the Charm mark. */
function CharmMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-[0.7rem] bg-gradient-to-br from-money to-reach shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
        <path d="M12 2 L14.6 9.4 L22 12 L14.6 14.6 L12 22 L9.4 14.6 L2 12 L9.4 9.4 Z" />
      </svg>
    </span>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
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
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-ink-400 transition hover:text-ink-700 active:scale-95"
      title="Actualiser"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-500" : "bg-emerald-500"}`} />
      <span className="tnum">{error ? "Échec de synchro" : lastSync ? `Synchronisé ${timeAgo(lastSync)}` : "Synchronisation…"}</span>
    </button>
  );
}
