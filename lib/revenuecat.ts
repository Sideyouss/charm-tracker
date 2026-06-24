import type { RevenuePayload } from "./types";

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
 * Pulls revenue from RevenueCat's v2 "overview metrics" endpoint.
 *
 * Requires two env vars:
 *   REVENUECAT_V2_API_KEY  - a v2 *secret* API key (Project settings > API keys)
 *   REVENUECAT_PROJECT_ID  - the project id from the dashboard URL
 *
 * The overview endpoint reports trailing-28-day revenue and MRR, not an
 * all-time lifetime total. To show "generated so far" we add REVENUE_BASELINE
 * (whatever you'd already earned before wiring this up) to the live number.
 */
export async function getRevenue(): Promise<RevenuePayload> {
  const key = process.env.REVENUECAT_V2_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const baseline = Number(process.env.REVENUE_BASELINE ?? "0") || 0;
  const now = new Date().toISOString();

  if (!key || !projectId) {
    // No credentials yet — return a clearly-labelled demo number so the UI is alive.
    const demo = baseline || 18_420;
    return {
      total: demo,
      currency: "USD",
      trailing28: 4_280,
      mrr: 1_950,
      source: "demo",
      status: "ok",
      updatedAt: now,
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
      total: baseline + trailing28,
      currency: "USD",
      trailing28,
      mrr,
      source: "revenuecat",
      status: "ok",
      updatedAt: now,
      note:
        baseline > 0
          ? undefined
          : "Showing trailing-28-day revenue. Set REVENUE_BASELINE for lifetime total.",
    };
  } catch (err) {
    return {
      total: baseline,
      currency: "USD",
      trailing28: null,
      mrr: null,
      source: "revenuecat",
      status: "error",
      updatedAt: now,
      note: err instanceof Error ? err.message : "Failed to reach RevenueCat",
    };
  }
}
