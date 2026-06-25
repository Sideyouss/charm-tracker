"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { REFRESH_INTERVAL_MS } from "@/lib/config";
import { DEFAULT_GOALS, type GoalsConfig } from "@/lib/goals-shared";
import type { RevenuePayload, ViewsPayload } from "@/lib/types";
import { formatCompact, formatMoney, timeAgo } from "@/lib/format";
import LiquidPanel from "./LiquidPanel";
import GoalEditor from "./GoalEditor";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

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
      setError(e instanceof Error ? e.message : "Failed to sync");
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

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-6 py-8 sm:px-10 sm:py-10">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <span className="text-sm font-semibold tracking-tight text-white/90">
          {goals.team}
        </span>
        <div className="flex items-center gap-1">
          <SyncBadge lastSync={lastSync} error={error} onRefresh={load} />
          <button
            onClick={() => setEditing(true)}
            className="rounded-full px-3 py-1.5 text-sm text-white/40 transition hover:text-white/80 active:scale-95"
          >
            Edit
          </button>
        </div>
      </motion.header>

      <section className="flex flex-1 flex-col justify-center py-14">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 max-w-xl text-balance text-xl font-medium leading-snug tracking-tight text-white/55 sm:mb-20 sm:text-2xl"
        >
          {goals.tagline}
        </motion.h1>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <LiquidPanel
            accent="money"
            label="Revenue"
            meta="RevenueCat"
            current={revenue?.total ?? 0}
            target={goals.revenueTarget}
            format={(n) => formatMoney(n, revenue?.currency ?? goals.currency)}
            status={revenue?.status ?? "ok"}
            loading={loading}
            delay={0.1}
          />

          <LiquidPanel
            accent="reach"
            label="Reach"
            meta={`TikTok · ${goals.windowDays}d`}
            current={views?.total ?? 0}
            target={goals.viewsTarget}
            format={(n) => formatCompact(n)}
            status={views?.status ?? "ok"}
            loading={loading}
            delay={0.2}
          />
        </div>
      </section>

      <footer className="flex items-center justify-between text-xs text-white/25">
        <span>Live • auto-refreshing every {Math.round(REFRESH_INTERVAL_MS / 1000)}s</span>
        <span className="tnum">{goals.team.toLowerCase()}</span>
      </footer>

      <GoalEditor
        open={editing}
        goals={goals}
        onClose={() => setEditing(false)}
        onSaved={(next) => setGoals(next)}
      />
    </main>
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
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/40 transition hover:text-white/80 active:scale-95"
      title="Refresh"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          error ? "bg-red-400" : "bg-emerald-400"
        }`}
      />
      <span className="tnum">
        {error ? "Sync failed" : lastSync ? timeAgo(lastSync) : "Syncing…"}
      </span>
    </button>
  );
}
