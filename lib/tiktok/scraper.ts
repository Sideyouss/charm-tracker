import type { TikTokProvider, TikTokVideo } from "./provider";
import { getConfiguredVideoUrls, videoIdFromUrl } from "./provider";

/**
 * Third-party scraper provider — the pragmatic "automatic" path that works
 * without waiting on TikTok's official API approval.
 *
 * This adapter is written against the common RapidAPI TikTok-scraper shape:
 * one GET per video that returns the play count. Point it at whichever
 * provider you subscribe to via env. You're responsible for staying inside
 * that provider's terms and TikTok's.
 *
 * Env:
 *   TIKTOK_SCRAPER_BASE_URL  - e.g. https://tiktok-scraper7.p.rapidapi.com
 *   TIKTOK_SCRAPER_HOST      - the RapidAPI host header value
 *   TIKTOK_SCRAPER_API_KEY   - your RapidAPI key
 *   TIKTOK_VIDEO_URLS        - the videos to count
 *
 * The JSON path to the view count differs slightly between providers, so we
 * probe a few common shapes (data.play_count, aweme_detail.statistics, ...).
 */
export const scraperProvider: TikTokProvider = {
  name: "tiktok-scraper",
  async fetchVideos(): Promise<TikTokVideo[]> {
    const baseUrl = process.env.TIKTOK_SCRAPER_BASE_URL;
    const host = process.env.TIKTOK_SCRAPER_HOST;
    const apiKey = process.env.TIKTOK_SCRAPER_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error(
        "TIKTOK_SCRAPER_BASE_URL and TIKTOK_SCRAPER_API_KEY are required",
      );
    }

    const urls = getConfiguredVideoUrls();
    if (urls.length === 0) {
      throw new Error("TIKTOK_VIDEO_URLS is empty — nothing to count");
    }

    const headers: Record<string, string> = {
      "x-rapidapi-key": apiKey,
      ...(host ? { "x-rapidapi-host": host } : {}),
    };

    const results = await Promise.allSettled(
      urls.map(async (url): Promise<TikTokVideo> => {
        const res = await fetch(
          `${baseUrl}/?url=${encodeURIComponent(url)}`,
          { headers, cache: "no-store" },
        );
        if (!res.ok) throw new Error(`scraper ${res.status} for ${url}`);
        const json = await res.json();
        return {
          id: videoIdFromUrl(url) ?? url,
          url,
          views: extractViews(json),
          postedAt: extractPostedAt(json),
        };
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<TikTokVideo> => r.status === "fulfilled")
      .map((r) => r.value);
  },
};

function extractViews(json: any): number {
  const candidates = [
    json?.data?.play_count,
    json?.data?.statistics?.play_count,
    json?.aweme_detail?.statistics?.play_count,
    json?.statistics?.play_count,
    json?.play_count,
    json?.views,
  ];
  const found = candidates.find((c) => typeof c === "number");
  return typeof found === "number" ? found : 0;
}

function extractPostedAt(json: any): string | undefined {
  const ts =
    json?.data?.create_time ??
    json?.aweme_detail?.create_time ??
    json?.create_time;
  if (typeof ts === "number") return new Date(ts * 1000).toISOString();
  return undefined;
}
