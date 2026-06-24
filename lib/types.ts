export type MetricStatus = "ok" | "stale" | "error";

export interface RevenuePayload {
  /** Total money generated "so far" in the smallest sensible unit: whole currency. */
  total: number;
  currency: string;
  /** Revenue earned in the trailing 28 days, when available from the source. */
  trailing28: number | null;
  /** Monthly recurring revenue, when available. */
  mrr: number | null;
  source: string;
  status: MetricStatus;
  updatedAt: string;
  note?: string;
}

export interface ViewsPayload {
  /** Total views inside the configured rolling window. */
  total: number;
  windowDays: number;
  /** Number of videos counted toward the total. */
  videoCount: number;
  source: string;
  status: MetricStatus;
  updatedAt: string;
  note?: string;
}
