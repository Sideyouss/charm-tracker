import type { TikTokProvider, TikTokVideo } from "./provider";
import { getConfiguredVideoUrls, videoIdFromUrl } from "./provider";

/**
 * Official TikTok provider — uses the TikTok for Developers "Query Videos"
 * endpoint to read view_count for videos you own.
 *
 * Requirements (see README for the full walkthrough):
 *   - A TikTok for Developers app with the `video.list` scope approved
 *   - An OAuth access token for the account that posted the videos
 *
 * Env:
 *   TIKTOK_ACCESS_TOKEN  - a valid user access token
 *   TIKTOK_VIDEO_URLS    - the videos to count (optional; if omitted, the
 *                          provider lists the account's own recent videos)
 *
 * Note: TikTok approval can take time and the API only exposes videos owned
 * by the authorising account. Until approved, use TIKTOK_PROVIDER=demo.
 */
export const officialProvider: TikTokProvider = {
  name: "tiktok-official",
  async fetchVideos(): Promise<TikTokVideo[]> {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) {
      throw new Error("TIKTOK_ACCESS_TOKEN is not set");
    }

    const ids = getConfiguredVideoUrls()
      .map((u) => videoIdFromUrl(u) ?? u)
      .filter(Boolean);

    const fields = "id,view_count,create_time";
    const body = ids.length
      ? { filters: { video_ids: ids } }
      : { max_count: 20 };

    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?fields=${fields}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      throw new Error(`TikTok API responded ${res.status}`);
    }

    const json = (await res.json()) as {
      data?: { videos?: Array<{ id: string; view_count: number; create_time: number }> };
    };

    return (json.data?.videos ?? []).map((v) => ({
      id: v.id,
      views: v.view_count ?? 0,
      postedAt: v.create_time
        ? new Date(v.create_time * 1000).toISOString()
        : undefined,
    }));
  },
};
