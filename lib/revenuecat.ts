import type { RevenuePayload } from "./types";
import { daysElapsed, monthStart } from "./month";

const OVERVIEW_ID_REVENUE = "revenue";
const OVERVIEW_ID_MRR = "mrr";

interface OverviewMetric {
  id: string;
  value: number;
  unit?: string;
}

interface OverviewResponse {
  metrics: OverviewMetric[];
}

interface RevenueMetricResponse {
  object: string;
  start_date: string;
  end_date: string;
  currency: string;
  value: number;
  revenue_type: string;
}

/**
 * Month-to-date revenue.
 *
 * Requires two env vars:
 *   REVENUECAT_V2_API_KEY  - a v2 *secret* API key (Project settings > API keys)
 *   REVENUECAT_PROJECT_ID  - the project id from the dashboard URL
 *
 * The exact figure comes from RevenueCat's Charts API
 * (GET /v2/projects/{id}/metrics/revenue with the month's date range), which
 * needs the `charts_metrics:charts:read` permission on the key. If that call
 * fails (e.g. missing permission), we fall back to an estimate — the
 * trailing-28-day daily rate applied to the days elapsed this month — and
 * flag it `estimated: true` with the reason in `note`.
 */
export async function getRevenue(): Promise<RevenuePayload> {
  const key = process.env.REVENUECAT_V2_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const now = new Date();
  const since = monthStart(now);

  if (!key || !projectId) {
    // No credentials yet — a believable month-in-progress so the UI is alive.
    return {
      total: Math.round(296 * Math.max(daysElapsed(now), 0.25)),
      currency: "USD",
      mrr: 1_950,
      since: since.toISOString(),
      estimated: false,
      source: "demo",
      status: "ok",
      updatedAt: now.toISOString(),
      note: "Demo data. Add REVENUECAT_V2_API_KEY + REVENUECAT_PROJECT_ID to go live.",
    };
  }

  const [month, overview] = await Promise.allSettled([
    fetchMonthRevenue(key, projectId, since, now),
    fetchOverview(key, projectId),
  ]);

  const mrr = overview.status === "fulfilled" ? overview.value.mrr : null;

  // Exact month-to-date from the Charts API.
  if (month.status === "fulfilled") {
    return {
      total: Math.round(month.value.value),
      currency: month.value.currency || "USD",
      mrr,
      since: since.toISOString(),
      estimated: false,
      source: "revenuecat",
      status: "ok",
      updatedAt: now.toISOString(),
    };
  }

  const monthError = month.reason instanceof Error ? month.reason.message : "appel Charts échoué";

  // Fallback: estimate from the trailing-28-day daily rate.
  if (overview.status === "fulfilled") {
    const elapsed = Math.max(daysElapsed(now), 0.25);
    return {
      total: Math.round((overview.value.trailing28 / 28) * elapsed),
      currency: "USD",
      mrr,
      since: since.toISOString(),
      estimated: true,
      source: "revenuecat",
      status: "ok",
      updatedAt: now.toISOString(),
      note: `Estimation (rythme 28 jours) — API Charts indisponible : ${monthError}. Vérifie que la clé v2 a la permission charts_metrics:charts:read.`,
    };
  }

  const overviewError =
    overview.status === "rejected" && overview.reason instanceof Error
      ? overview.reason.message
      : "Failed to reach RevenueCat";

  return {
    total: 0,
    currency: "USD",
    mrr: null,
    since: since.toISOString(),
    estimated: false,
    source: "revenuecat",
    status: "error",
    updatedAt: now.toISOString(),
    note: `${monthError} / ${overviewError}`,
  };
}

/** Exact revenue for the ongoing month via the Charts API (Feb 2026+). */
async function fetchMonthRevenue(
  key: string,
  projectId: string,
  since: Date,
  now: Date,
): Promise<{ value: number; currency: string }> {
  const params = new URLSearchParams({
    start_date: ymd(since),
    end_date: ymd(now),
  });
  const res = await fetch(
    `https://api.revenuecat.com/v2/projects/${projectId}/metrics/revenue?${params}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`metrics/revenue a répondu ${res.status}`);
  }
  const data = (await res.json()) as RevenueMetricResponse;
  return { value: data.value ?? 0, currency: data.currency };
}

/** Trailing-28-day revenue + MRR from the overview endpoint. */
async function fetchOverview(
  key: string,
  projectId: string,
): Promise<{ trailing28: number; mrr: number | null }> {
  const res = await fetch(
    `https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`metrics/overview a répondu ${res.status}`);
  }
  const data = (await res.json()) as OverviewResponse;
  const byId = new Map(data.metrics.map((m) => [m.id, m.value]));
  return {
    trailing28: byId.get(OVERVIEW_ID_REVENUE) ?? 0,
    mrr: byId.get(OVERVIEW_ID_MRR) ?? null,
  };
}

/** Local-time YYYY-MM-DD, the format the Charts API expects. */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
