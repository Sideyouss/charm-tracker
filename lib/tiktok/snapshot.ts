import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TikTokProvider, TikTokVideo } from "./provider";

/**
 * Snapshot provider — reads the JSON produced by scripts/collect-tiktok.mjs
 * (which runs yt-dlp on a schedule via GitHub Actions). This is what the
 * Vercel app uses in production: no yt-dlp, no scraping, no blocking — just a
 * fast read of pre-collected numbers.
 *
 * Source resolution:
 *   TIKTOK_SNAPSHOT_URL  - a raw JSON URL (e.g. raw.githubusercontent of the
 *                          data branch). Preferred on Vercel: updates without a
 *                          redeploy. Fetched fresh every time.
 *   otherwise            - reads data/tiktok-views.json from the deploy bundle.
 */
interface SnapshotShape {
  generatedAt: string;
  videos: Array<{
    id: string;
    url?: string;
    views: number;
    postedAt?: string | null;
  }>;
}

export const snapshotProvider: TikTokProvider = {
  name: "tiktok-snapshot",
  async fetchVideos(): Promise<TikTokVideo[]> {
    const snap = await loadSnapshot();
    return snap.videos.map((v) => ({
      id: v.id,
      url: v.url,
      views: v.views || 0,
      postedAt: v.postedAt ?? undefined,
    }));
  },
};

async function loadSnapshot(): Promise<SnapshotShape> {
  const url = process.env.TIKTOK_SNAPSHOT_URL;
  if (url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`snapshot URL responded ${res.status}`);
    }
    return (await res.json()) as SnapshotShape;
  }

  try {
    const path = join(process.cwd(), "data", "tiktok-views.json");
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as SnapshotShape;
  } catch {
    throw new Error(
      "No TikTok snapshot found. Set TIKTOK_SNAPSHOT_URL or run `npm run collect:tiktok`.",
    );
  }
}
