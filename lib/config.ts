/**
 * Central place to tune the dashboard.
 * The numeric goals here are placeholders — change them to your real targets.
 * Both goals are measured over the ongoing calendar month and reset on the 1st.
 */

export const BRAND = {
  team: "Charm",
  tagline: "Un écran. Deux chiffres qui comptent. Jusqu'à les atteindre.",
};

export const GOALS = {
  revenue: {
    /** Revenue target for the ongoing month (placeholder). */
    target: 100_000,
    currency: "USD",
  },
  views: {
    /** Views target for the ongoing month (placeholder). */
    target: 5_000_000,
  },
};

/** How often the browser re-pulls fresh numbers (ms). */
export const REFRESH_INTERVAL_MS = 60_000;
