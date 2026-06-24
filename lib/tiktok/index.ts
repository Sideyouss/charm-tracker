import { getGoals } from "../goals";
import type { ViewsPayload } from "../types";
import { htmlProvider } from "./html";
import { mockProvider } from "./mock";
import { officialProvider } from "./official";
import { scraperProvider } from "./scraper";
import { snapshotProvider } from "./snapshot";
import { summariseViews, type TikTokProvider } from "./provider";

function pickProvider(): TikTokProvider {
  switch ((process.env.TIKTOK_PROVIDER ?? "demo").toLowerCase()) {
    case "snapshot":
      return snapshotProvider;
    case "html":
      return htmlProvider;
    case "official":
      return officialProvider;
    case "scraper":
      return scraperProvider;
    case "demo":
    default:
      return mockProvider;
  }
}

export async function getViews(): Promise<ViewsPayload> {
  const provider = pickProvider();
  const { windowDays } = await getGoals();

  try {
    const videos = await provider.fetchVideos();
    const note =
      provider.name === "demo"
        ? "Demo data. Set TIKTOK_PROVIDER + video sources to go live."
        : undefined;
    return summariseViews(videos, windowDays, provider.name, note);
  } catch (err) {
    return {
      total: 0,
      windowDays,
      videoCount: 0,
      source: provider.name,
      status: "error",
      updatedAt: new Date().toISOString(),
      note: err instanceof Error ? err.message : "Failed to load TikTok views",
    };
  }
}
