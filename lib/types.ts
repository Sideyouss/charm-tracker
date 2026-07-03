export type MetricStatus = "ok" | "stale" | "error";

export interface RevenuePayload {
  /** Revenue generated during the ongoing calendar month, in whole currency. */
  total: number;
  currency: string;
  /** Monthly recurring revenue, when available. */
  mrr: number | null;
  /** ISO date the month window opened (the 1st). */
  since: string;
  /** True when the month-to-date figure is derived rather than exact. */
  estimated: boolean;
  source: string;
  status: MetricStatus;
  updatedAt: string;
  note?: string;
  /** Step-by-step trace of the upstream calls; present with ?debug=1. */
  debug?: string[];
}

export interface ViewsPayload {
  /** Total views of videos posted during the ongoing calendar month. */
  total: number;
  /** ISO date the month window opened (the 1st). */
  since: string;
  /** Number of videos counted toward the total. */
  videoCount: number;
  source: string;
  status: MetricStatus;
  updatedAt: string;
  note?: string;
}
