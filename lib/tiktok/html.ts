import type { TikTokProvider, TikTokVideo } from "./provider";
import { getConfiguredVideoUrls, videoIdFromUrl } from "./provider";

/**
 * Direct-HTML provider — no third-party API, no key.
 *
 * For each video URL in TIKTOK_VIDEO_URLS we fetch the public page and pull the
 * view count straight out of the JSON TikTok embeds in its HTML. TikTok ships
 * the data in a <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"> blob (and, on
 * older responses, SIGI_STATE), so we parse that and fall back to a regex.
 *
 * Reality check: TikTok blocks automated requests from datacenter IP ranges
 * (which includes most serverless hosts). From a residential IP this is very
 * reliable; from a blocked host you'll get a verification page and a 0/“blocked”
 * note instead of a number. That's a TikTok limitation, not a bug here.
 *
 * Env:
 *   TIKTOK_PROVIDER=html
 *   TIKTOK_VIDEO_URLS=https://www.tiktok.com/@you/video/123, https://...
 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

export const htmlProvider: TikTokProvider = {
  name: "tiktok-html",
  async fetchVideos(): Promise<TikTokVideo[]> {
    const urls = getConfiguredVideoUrls();
    if (urls.length === 0) {
      throw new Error("TIKTOK_VIDEO_URLS is empty — add your video URLs");
    }

    const settled = await Promise.allSettled(
      urls.map((url) => scrapeOne(url)),
    );

    const videos: TikTokVideo[] = [];
    const failures: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") videos.push(r.value);
      else failures.push(`${urls[i]}: ${r.reason?.message ?? r.reason}`);
    });

    // Surface a hard failure only if EVERY video failed — otherwise we show
    // what we got and let the route note partial blocking.
    if (videos.length === 0) {
      throw new Error(
        `All ${urls.length} videos failed (TikTok likely blocked this IP). ` +
          failures[0],
      );
    }

    return videos;
  },
};

async function scrapeOne(url: string): Promise<TikTokVideo> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const html = await res.text();
  const stats = extractStats(html);

  if (stats.views == null) {
    if (
      /_wafchallengeid|SlardarWAF|wafchallenge|Please wait|verify|captcha|tiktok\.com\/login|__APP_LOADER__/i.test(
        html,
      )
    ) {
      throw new Error("blocked by TikTok WAF challenge");
    }
    throw new Error("playCount not found in page");
  }

  return {
    id: videoIdFromUrl(url) ?? url,
    url,
    views: stats.views,
    postedAt: stats.postedAt,
  };
}

interface ExtractedStats {
  views: number | null;
  postedAt?: string;
}

/** Try the structured JSON blob first, then fall back to raw regex. */
function extractStats(html: string): ExtractedStats {
  const fromJson = extractFromUniversalData(html);
  if (fromJson.views != null) return fromJson;

  const playMatch = html.match(/"playCount":\s*(\d+)/);
  const createMatch = html.match(/"createTime":\s*"?(\d{9,})"?/);
  return {
    views: playMatch ? Number(playMatch[1]) : null,
    postedAt: createMatch
      ? new Date(Number(createMatch[1]) * 1000).toISOString()
      : undefined,
  };
}

function extractFromUniversalData(html: string): ExtractedStats {
  const blob = matchScript(
    html,
    'id="__UNIVERSAL_DATA_FOR_REHYDRATION__"',
  );
  if (!blob) return { views: null };

  try {
    const data = JSON.parse(blob);
    const item =
      data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
    if (!item) return { views: null };
    const playCount = item?.stats?.playCount ?? item?.statsV2?.playCount;
    const createTime = item?.createTime;
    return {
      views: playCount != null ? Number(playCount) : null,
      postedAt: createTime
        ? new Date(Number(createTime) * 1000).toISOString()
        : undefined,
    };
  } catch {
    return { views: null };
  }
}

/** Pull the inner JSON of a <script ... <selector> ...>JSON</script> tag. */
function matchScript(html: string, selector: string): string | null {
  const idx = html.indexOf(selector);
  if (idx === -1) return null;
  const open = html.indexOf(">", idx);
  const close = html.indexOf("</script>", open);
  if (open === -1 || close === -1) return null;
  return html.slice(open + 1, close).trim();
}
