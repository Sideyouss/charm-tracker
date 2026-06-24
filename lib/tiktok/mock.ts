import type { TikTokProvider, TikTokVideo } from "./provider";

/**
 * Demo provider. Generates a believable, slowly-growing set of videos so the
 * dashboard looks alive before you connect a real data source. The total
 * drifts upward over the day so refreshes feel real.
 */
export const mockProvider: TikTokProvider = {
  name: "demo",
  async fetchVideos(): Promise<TikTokVideo[]> {
    const seedTitles = 14;
    const minutesToday = (Date.now() % (24 * 60 * 60 * 1000)) / 60000;
    const drift = Math.floor(minutesToday * 137);

    return Array.from({ length: seedTitles }, (_, i) => {
      const base = [412_300, 88_700, 1_240_000, 56_900, 203_400, 31_200, 742_000, 19_800, 96_500, 158_000, 44_600, 612_300, 27_400, 380_900][i];
      const ageDays = i * 2;
      return {
        id: `demo-${i}`,
        views: base + drift + i * 311,
        postedAt: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies TikTokVideo;
    });
  },
};
