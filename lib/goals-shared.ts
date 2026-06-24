import { BRAND, GOALS as DEFAULTS } from "./config";

/**
 * Client-safe goal types + defaults. No node imports here, so this can be
 * pulled into client components. Server-only persistence lives in goals.ts.
 */
export interface GoalsConfig {
  team: string;
  tagline: string;
  revenueTarget: number;
  currency: string;
  viewsTarget: number;
  windowDays: number;
}

export const DEFAULT_GOALS: GoalsConfig = {
  team: BRAND.team,
  tagline: BRAND.tagline,
  revenueTarget: DEFAULTS.revenue.target,
  currency: DEFAULTS.revenue.currency,
  viewsTarget: DEFAULTS.views.target,
  windowDays: DEFAULTS.views.windowDays,
};

/** Clamp/normalise so a bad edit can't break the dashboard. */
export function sanitize(g: GoalsConfig): GoalsConfig {
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const str = (v: unknown, fallback: string, max = 120) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

  return {
    team: str(g.team, DEFAULT_GOALS.team, 40),
    tagline: str(g.tagline, DEFAULT_GOALS.tagline, 160),
    revenueTarget: Math.round(num(g.revenueTarget, DEFAULT_GOALS.revenueTarget)),
    currency: str(g.currency, DEFAULT_GOALS.currency, 3).toUpperCase(),
    viewsTarget: Math.round(num(g.viewsTarget, DEFAULT_GOALS.viewsTarget)),
    windowDays: Math.min(
      365,
      Math.max(1, Math.round(num(g.windowDays, DEFAULT_GOALS.windowDays))),
    ),
  };
}
