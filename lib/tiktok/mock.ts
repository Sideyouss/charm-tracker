import { monthStart } from "../month";
import type { TikTokProvider, TikTokVideo } from "./provider";

/**
 * Demo provider. Generates a believable set of videos — most posted during
 * the ongoing month (so the month-to-date total is alive whatever the date),
 * plus a few from last month that the summariser should filter out. The
 * numbers drift upward over the day so refreshes feel real.
 */
export const mockProvider: TikTokProvider = {
  name: "demo",
  async fetchVideos(): Promise<TikTokVideo[]> {
    const now = Date.now();
    const start = monthStart().getTime();
    const span = Math.max(now - start, 60 * 60 * 1000);
    const minutesToday = (now % (24 * 60 * 60 * 1000)) / 60000;
    const drift = Math.floor(minutesToday * 137);

    const bases = [412_300, 88_700, 1_240_000, 56_900, 203_400, 31_200, 742_000, 19_800, 96_500];

    // Spread across the elapsed part of this month.
    const thisMonth = bases.map((base, i) => ({
      id: `demo-${i}`,
      views: base + drift + i * 311,
      postedAt: new Date(start + (i / bases.length) * span * 0.95).toISOString(),
    }));

    // Last month's tail — must be excluded by the month filter.
    const lastMonth = [158_000, 44_600, 612_300, 27_400, 380_900].map((base, i) => ({
      id: `demo-old-${i}`,
      views: base,
      postedAt: new Date(start - (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
    }));

    return [...thisMonth, ...lastMonth] satisfies TikTokVideo[];
  },
};
