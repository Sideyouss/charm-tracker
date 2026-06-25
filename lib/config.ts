/**
 * Central place to tune the dashboard.
 * The numeric goals here are placeholders — change them to your real targets.
 */

export const BRAND = {
  team: "Charm",
  tagline: "Un écran. Deux chiffres qui comptent. Jusqu'à les atteindre.",
};

export const GOALS = {
  revenue: {
    /** The money objective you're driving toward (placeholder). */
    target: 100_000,
    currency: "USD",
    label: "Revenue generated",
    objectiveLabel: "Objective",
  },
  views: {
    /** Target views inside the rolling window (placeholder). */
    target: 5_000_000,
    /** Rolling window the view goal is measured over. */
    windowDays: 30,
    label: "Views",
    objectiveLabel: "30-day target",
  },
};

/** How often the browser re-pulls fresh numbers (ms). */
export const REFRESH_INTERVAL_MS = 60_000;
