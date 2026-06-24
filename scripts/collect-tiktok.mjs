/**
 * Collects TikTok view counts with yt-dlp and writes a JSON snapshot.
 *
 * yt-dlp talks to TikTok's signed mobile API, so it reads view_count reliably
 * where raw HTML scraping gets WAF-blocked. It's a Python tool, so this runs
 * wherever Python + yt-dlp exist — your machine, a VPS, or (the intended home)
 * a free GitHub Actions cron. The Vercel app never runs yt-dlp; it just reads
 * the snapshot this produces.
 *
 * TIKTOK_VIDEO_URLS can contain:
 *   - a PROFILE url (recommended): https://www.tiktok.com/@yourhandle
 *     yt-dlp auto-discovers your recent videos — post a new one and it's counted
 *     on the next run with zero config changes.
 *   - individual VIDEO urls: https://www.tiktok.com/@you/video/123
 *   - any mix of the two, comma or newline separated.
 *
 * Env:
 *   TIKTOK_VIDEO_URLS    - profile and/or video urls
 *   TIKTOK_WINDOW_DAYS   - how many days back to pull from profiles (default 60;
 *                          the dashboard trims this to its own goal window)
 *   TIKTOK_MAX           - safety cap on videos pulled per profile (default 80)
 *   YTDLP_CMD            - override the yt-dlp command (default: "yt-dlp",
 *                          falls back to "python -m yt_dlp")
 *   TIKTOK_OUT           - output path (default: data/tiktok-views.json)
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const sources = (process.env.TIKTOK_VIDEO_URLS ?? "")
  .split(/[\n,]/)
  .map((s) => s.trim())
  .filter(Boolean);

const windowDays = Number(process.env.TIKTOK_WINDOW_DAYS ?? "60") || 60;
const maxPerProfile = Number(process.env.TIKTOK_MAX ?? "80") || 80;
const outPath = process.env.TIKTOK_OUT ?? "data/tiktok-views.json";

const PRINT = "%(id)s\t%(view_count)s\t%(timestamp)s\t%(uploader)s\t%(webpage_url)s";

if (sources.length === 0) {
  console.error("No TIKTOK_VIDEO_URLS provided. Nothing to collect.");
  process.exit(1);
}

/** A profile URL has @handle but no /video/ segment. */
function isProfile(url) {
  return /tiktok\.com\/@[^/]+\/?($|\?)/.test(url) && !/\/video\//.test(url);
}

/** yt-dlp date filter expects YYYYMMDD. */
function cutoffDate(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function resolveYtDlp() {
  if (process.env.YTDLP_CMD) {
    const [cmd, ...rest] = process.env.YTDLP_CMD.split(" ");
    return { cmd, base: rest };
  }
  try {
    await run("yt-dlp", ["--version"]);
    return { cmd: "yt-dlp", base: [] };
  } catch {
    return { cmd: "python", base: ["-m", "yt_dlp"] };
  }
}

function parseLines(stdout) {
  return stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, views, ts, uploader, url] = line.split("\t");
      return {
        id: id || url,
        url: url || null,
        uploader: uploader && uploader !== "NA" ? uploader : null,
        views: Number(views) || 0,
        postedAt:
          ts && ts !== "NA" ? new Date(Number(ts) * 1000).toISOString() : null,
      };
    });
}

async function fetchProfile(runner, url) {
  const args = [
    ...runner.base,
    "--no-warnings",
    "--ignore-errors",
    "--skip-download",
    "--dateafter",
    cutoffDate(windowDays),
    "--playlist-end",
    String(maxPerProfile),
    "--print",
    PRINT,
    url,
  ];
  const { stdout } = await run(runner.cmd, args, { timeout: 240_000, maxBuffer: 1 << 24 });
  return parseLines(stdout);
}

async function fetchVideo(runner, url) {
  const args = [
    ...runner.base,
    "--no-warnings",
    "--skip-download",
    "--print",
    PRINT,
    url,
  ];
  const { stdout } = await run(runner.cmd, args, { timeout: 60_000 });
  return parseLines(stdout);
}

async function main() {
  const runner = await resolveYtDlp();
  console.log(`Using: ${runner.cmd} ${runner.base.join(" ")}`.trim());

  const byId = new Map();
  for (const src of sources) {
    try {
      const found = isProfile(src)
        ? await fetchProfile(runner, src)
        : await fetchVideo(runner, src);
      for (const v of found) byId.set(v.id, v);
      console.log(
        `  ok   ${found.length} video(s)  ${isProfile(src) ? "profile" : "video"}  ${src}`,
      );
    } catch (err) {
      console.error(`  fail ${src}: ${err.message?.split("\n")[0]}`);
    }
  }

  const videos = [...byId.values()];
  const snapshot = {
    generatedAt: new Date().toISOString(),
    total: videos.reduce((s, v) => s + v.views, 0),
    videoCount: videos.length,
    videos,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(
    `\nWrote ${outPath} — ${snapshot.videoCount} videos, ${snapshot.total.toLocaleString()} total views.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
