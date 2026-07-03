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

/** Log a diagnostic step: always to the server console, and into the trace. */
type Say = (msg: string) => void;

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
 *
 * Pass `debug = true` (GET /api/revenue?debug=1) to get the full trace of
 * every upstream call in the response, alongside the [revenue] server logs.
 */
export async function getRevenue(debug = false): Promise<RevenuePayload> {
  const trace: string[] = [];
  const say: Say = (msg) => {
    trace.push(msg);
    console.log("[revenue]", msg);
  };
  const withTrace = (payload: RevenuePayload): RevenuePayload =>
    debug ? { ...payload, debug: trace } : payload;

  const key = process.env.REVENUECAT_V2_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const now = new Date();
  const since = monthStart(now);

  say(
    `env: REVENUECAT_V2_API_KEY ${key ? `set (${key.length} chars, starts "${key.slice(0, 7)}…")` : "MISSING"}, ` +
      `REVENUECAT_PROJECT_ID ${projectId ? `set ("${projectId}")` : "MISSING"}`,
  );
  say(`month window: ${ymd(since)} -> ${ymd(now)} (${daysElapsed(now).toFixed(2)} days elapsed)`);

  if (!key || !projectId) {
    say("no credentials -> DEMO data (the number on screen is fake)");
    return withTrace({
      total: Math.round(296 * Math.max(daysElapsed(now), 0.25)),
      currency: "USD",
      mrr: 1_950,
      since: since.toISOString(),
      estimated: false,
      source: "demo",
      status: "ok",
      updatedAt: now.toISOString(),
      note: "Demo data. Add REVENUECAT_V2_API_KEY + REVENUECAT_PROJECT_ID to go live.",
    });
  }

  const [month, overview] = await Promise.allSettled([
    fetchMonthRevenue(key, projectId, since, now, say),
    fetchOverview(key, projectId, say),
  ]);

  const mrr = overview.status === "fulfilled" ? overview.value.mrr : null;

  // Exact month-to-date from the Charts API.
  if (month.status === "fulfilled") {
    say(`RESULT: exact month-to-date = ${month.value.value} ${month.value.currency || "USD"}`);
    return withTrace({
      total: Math.round(month.value.value),
      currency: month.value.currency || "USD",
      mrr,
      since: since.toISOString(),
      estimated: false,
      source: "revenuecat",
      status: "ok",
      updatedAt: now.toISOString(),
    });
  }

  const monthError = month.reason instanceof Error ? month.reason.message : "appel Charts échoué";
  say(`metrics/revenue FAILED: ${monthError}`);

  // Fallback: estimate from the trailing-28-day daily rate.
  if (overview.status === "fulfilled") {
    const elapsed = Math.max(daysElapsed(now), 0.25);
    const estimate = Math.round((overview.value.trailing28 / 28) * elapsed);
    say(
      `RESULT: falling back to ESTIMATE = trailing28 (${overview.value.trailing28}) / 28 * ${elapsed.toFixed(2)} days = ${estimate}`,
    );
    return withTrace({
      total: estimate,
      currency: "USD",
      mrr,
      since: since.toISOString(),
      estimated: true,
      source: "revenuecat",
      status: "ok",
      updatedAt: now.toISOString(),
      note: `Estimation (rythme 28 jours) — API Charts indisponible : ${monthError}. Vérifie que la clé v2 a la permission charts_metrics:charts:read.`,
    });
  }

  const overviewError =
    overview.status === "rejected" && overview.reason instanceof Error
      ? overview.reason.message
      : "Failed to reach RevenueCat";
  say(`RESULT: both calls failed -> error state (overview: ${overviewError})`);

  return withTrace({
    total: 0,
    currency: "USD",
    mrr: null,
    since: since.toISOString(),
    estimated: false,
    source: "revenuecat",
    status: "error",
    updatedAt: now.toISOString(),
    note: `${monthError} / ${overviewError}`,
  });
}

/** Exact revenue for the ongoing month via the Charts API (Feb 2026+). */
async function fetchMonthRevenue(
  key: string,
  projectId: string,
  since: Date,
  now: Date,
  say: Say,
): Promise<{ value: number; currency: string }> {
  const params = new URLSearchParams({
    start_date: ymd(since),
    end_date: ymd(now),
  });
  const url = `https://api.revenuecat.com/v2/projects/${projectId}/metrics/revenue?${params}`;
  say(`GET ${url}`);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const body = await res.text();
  say(`metrics/revenue -> HTTP ${res.status}, body: ${body.slice(0, 800)}`);

  if (!res.ok) {
    throw new Error(`metrics/revenue a répondu ${res.status} — ${body.slice(0, 200)}`);
  }

  const data = JSON.parse(body) as RevenueMetricResponse;
  say(
    `metrics/revenue parsed: value=${data.value} currency=${data.currency} ` +
      `revenue_type=${data.revenue_type} range=${data.start_date}..${data.end_date}`,
  );
  return { value: data.value ?? 0, currency: data.currency };
}

/** Trailing-28-day revenue + MRR from the overview endpoint. */
async function fetchOverview(
  key: string,
  projectId: string,
  say: Say,
): Promise<{ trailing28: number; mrr: number | null }> {
  const url = `https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`;
  say(`GET ${url}`);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const body = await res.text();
  say(`metrics/overview -> HTTP ${res.status}, body: ${body.slice(0, 800)}`);

  if (!res.ok) {
    throw new Error(`metrics/overview a répondu ${res.status} — ${body.slice(0, 200)}`);
  }

  const data = JSON.parse(body) as OverviewResponse;
  const byId = new Map(data.metrics.map((m) => [m.id, m.value]));
  const trailing28 = byId.get(OVERVIEW_ID_REVENUE) ?? 0;
  const mrr = byId.get(OVERVIEW_ID_MRR) ?? null;
  say(`metrics/overview parsed: trailing28=${trailing28} mrr=${mrr}`);
  return { trailing28, mrr };
}

/** Local-time YYYY-MM-DD, the format the Charts API expects. */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
