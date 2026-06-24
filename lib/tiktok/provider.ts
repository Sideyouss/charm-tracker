import type { ViewsPayload } from "../types";

export interface TikTokVideo {
  /** TikTok video id or full URL. */
  id: string;
  url?: string;
  views: number;
  /** ISO date the video was posted, when known. */
  postedAt?: string;
}

export interface TikTokProvider {
  name: string;
  /** Returns the videos to count, each with a current view count. */
  fetchVideos(): Promise<TikTokVideo[]>;
}

/**
 * Parse the TIKTOK_VIDEO_URLS env var: a comma/newline separated list of the
 * videos you've posted (your "script" of content). Example:
 *   TIKTOK_VIDEO_URLS=https://www.tiktok.com/@charm/video/123,https://...
 */
export function getConfiguredVideoUrls(): string[] {
  return (process.env.TIKTOK_VIDEO_URLS ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract the numeric video id from a TikTok URL. */
export function videoIdFromUrl(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Reduce a list of videos to the rolling-window total used by the dashboard.
 * Videos with a known postedAt outside the window are excluded; videos with
 * no date are always counted (you only added them because they're recent).
 */
export function summariseViews(
  videos: TikTokVideo[],
  windowDays: number,
  source: string,
  note?: string,
): ViewsPayload {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = videos.filter((v) => {
    if (!v.postedAt) return true;
    const t = Date.parse(v.postedAt);
    return Number.isNaN(t) ? true : t >= cutoff;
  });

  const total = inWindow.reduce((sum, v) => sum + (v.views || 0), 0);

  return {
    total,
    windowDays,
    videoCount: inWindow.length,
    source,
    status: "ok",
    updatedAt: new Date().toISOString(),
    note,
  };
}
