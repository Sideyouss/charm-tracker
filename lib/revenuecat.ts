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

/**
 * Month-to-date revenue.
 *
 * Requires two env vars:
 *   REVENUECAT_V2_API_KEY  - a v2 *secret* API key (Project settings > API keys)
 *   REVENUECAT_PROJECT_ID  - the project id from the dashboard URL
 *
 * RevenueCat's overview endpoint only reports trailing-28-day revenue and MRR
 * — it has no calendar-month breakdown. So the live month-to-date figure is
 * an estimate: the trailing-28-day daily rate applied to the days elapsed
 * this month. It's flagged `estimated: true` and resets on the 1st.
 */
export async function getRevenue(): Promise<RevenuePayload> {
  const key = process.env.REVENUECAT_V2_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const now = new Date();
  const since = monthStart(now).toISOString();
  // Never divide the month by zero minutes on the 1st.
  const elapsed = Math.max(daysElapsed(now), 0.25);

  if (!key || !projectId) {
    // No credentials yet — a believable month-in-progress so the UI is alive.
    return {
      total: Math.round(296 * elapsed),
      currency: "USD",
      mrr: 1_950,
      since,
      estimated: false,
      source: "demo",
      status: "ok",
      updatedAt: now.toISOString(),
      note: "Demo data. Add REVENUECAT_V2_API_KEY + REVENUECAT_PROJECT_ID to go live.",
    };
  }

  try {
    const res = await fetch(
      `https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        // Always hit the network; this route is already cached upstream.
        cache: "no-store",
      },
    );

    if (!res.ok) {
      throw new Error(`RevenueCat responded ${res.status}`);
    }

    const data = (await res.json()) as OverviewResponse;
    const byId = new Map(data.metrics.map((m) => [m.id, m.value]));
    const trailing28 = byId.get(OVERVIEW_ID_REVENUE) ?? 0;
    const mrr = byId.get(OVERVIEW_ID_MRR) ?? null;

    return {
      total: Math.round((trailing28 / 28) * elapsed),
      currency: "USD",
      mrr,
      since,
      estimated: true,
      source: "revenuecat",
      status: "ok",
      updatedAt: now.toISOString(),
      note: "Estimation : rythme des 28 derniers jours appliqué au mois en cours.",
    };
  } catch (err) {
    return {
      total: 0,
      currency: "USD",
      mrr: null,
      since,
      estimated: false,
      source: "revenuecat",
      status: "error",
      updatedAt: now.toISOString(),
      note: err instanceof Error ? err.message : "Failed to reach RevenueCat",
    };
  }
}
