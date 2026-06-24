"use client";

import { useCallback, useEffect, useState } from "react";
import { GOALS, REFRESH_INTERVAL_MS } from "@/lib/config";
import { DEFAULT_GOALS, type GoalsConfig } from "@/lib/goals-shared";
import type { RevenuePayload, ViewsPayload } from "@/lib/types";
import {
  formatCompact,
  formatInt,
  formatMoney,
  timeAgo,
} from "@/lib/format";
import GoalCard from "./GoalCard";
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
    <main className="relative mx-auto min-h-[100dvh] w-full max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
              {goals.team} · Mission Control
            </span>
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            {goals.tagline}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/65 transition active:translate-y-[1px] hover:border-white/20 hover:bg-white/[0.06] hover:text-white/90"
          >
            Edit goals
          </button>
          <SyncBadge lastSync={lastSync} error={error} onRefresh={load} />
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GoalCard
          accent="money"
          eyebrow={GOALS.revenue.label}
          objectiveLabel={GOALS.revenue.objectiveLabel}
          current={revenue?.total ?? 0}
          target={goals.revenueTarget}
          format={(n) => formatMoney(n, revenue?.currency ?? goals.currency)}
          formatRemaining={(n) => formatMoney(n, revenue?.currency ?? goals.currency)}
          status={revenue?.status ?? "ok"}
          loading={loading}
          note={revenue?.note}
          subStats={[
            {
              label: "Last 28 days",
              value:
                revenue?.trailing28 != null
                  ? formatMoney(revenue.trailing28, revenue.currency)
                  : "—",
            },
            {
              label: "MRR",
              value:
                revenue?.mrr != null
                  ? formatMoney(revenue.mrr, revenue.currency)
                  : "—",
            },
            { label: "Source", value: revenue?.source ?? "—" },
          ]}
        />

        <GoalCard
          accent="reach"
          eyebrow={`${GOALS.views.label} · last ${goals.windowDays} days`}
          objectiveLabel={GOALS.views.objectiveLabel}
          current={views?.total ?? 0}
          target={goals.viewsTarget}
          format={(n) => formatCompact(n)}
          formatRemaining={(n) => formatCompact(n)}
          status={views?.status ?? "ok"}
          loading={loading}
          note={views?.note}
          subStats={[
            {
              label: "Videos counted",
              value: views ? formatInt(views.videoCount) : "—",
            },
            {
              label: "Exact",
              value: views ? formatInt(views.total) : "—",
            },
            { label: "Source", value: views?.source ?? "—" },
          ]}
        />
      </div>

      <footer className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/35">
        <span>Auto-refreshes every {Math.round(REFRESH_INTERVAL_MS / 1000)}s.</span>
        <span>Revenue via RevenueCat · Reach via TikTok.</span>
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
      className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition active:translate-y-[1px] hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          error ? "bg-red-400" : "bg-emerald-400"
        }`}
      />
      <span className="tnum">
        {error
          ? "Sync failed"
          : lastSync
            ? `Synced ${timeAgo(lastSync)}`
            : "Syncing…"}
      </span>
      <span className="text-white/30 transition group-hover:text-white/60">
        ↻
      </span>
    </button>
  );
}
