"use client";

import { useCallback, useEffect, useState } from "react";
import { REFRESH_INTERVAL_MS } from "@/lib/config";
import { DEFAULT_GOALS, type GoalsConfig } from "@/lib/goals-shared";
import type { RevenuePayload, ViewsPayload } from "@/lib/types";
import { formatCompact, formatInt, formatMoney, timeAgo } from "@/lib/format";
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
    <main className="mx-auto w-full max-w-4xl px-6 py-14 sm:px-8 sm:py-20">
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium tracking-tight text-white/90">
          {goals.team}
        </span>
        <div className="flex items-center gap-1">
          <SyncBadge lastSync={lastSync} error={error} onRefresh={load} />
          <button
            onClick={() => setEditing(true)}
            className="rounded-full px-3 py-1.5 text-sm text-white/40 transition hover:text-white/80"
          >
            Edit
          </button>
        </div>
      </header>

      <div className="mt-14 sm:mt-16">
        <h1 className="max-w-xl text-balance text-2xl font-medium leading-snug tracking-tight text-white/90 sm:text-[1.75rem]">
          {goals.tagline}
        </h1>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 lg:grid-cols-2">
        <GoalCard
          accent="money"
          label="Revenue"
          meta="RevenueCat"
          current={revenue?.total ?? 0}
          target={goals.revenueTarget}
          format={(n) => formatMoney(n, revenue?.currency ?? goals.currency)}
          status={revenue?.status ?? "ok"}
          loading={loading}
          stats={[
            {
              label: "MRR",
              value:
                revenue?.mrr != null
                  ? formatMoney(revenue.mrr, revenue.currency)
                  : "—",
            },
            {
              label: "Last 28d",
              value:
                revenue?.trailing28 != null
                  ? formatMoney(revenue.trailing28, revenue.currency)
                  : "—",
            },
          ]}
        />

        <GoalCard
          accent="reach"
          label="Reach"
          meta={`TikTok · ${goals.windowDays}d`}
          current={views?.total ?? 0}
          target={goals.viewsTarget}
          format={(n) => formatCompact(n)}
          status={views?.status ?? "ok"}
          loading={loading}
          stats={[
            {
              label: "Videos",
              value: views ? formatInt(views.videoCount) : "—",
            },
            {
              label: "Exact views",
              value: views ? formatInt(views.total) : "—",
            },
          ]}
        />
      </div>

      <footer className="mt-10 text-sm text-white/25">
        Auto-refreshing every {Math.round(REFRESH_INTERVAL_MS / 1000)}s.
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
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/40 transition hover:text-white/80"
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
