/**
 * Collects TikTok view counts with yt-dlp and writes a JSON snapshot.
 *
 * yt-dlp talks to TikTok's signed mobile API, so it reads view_count reliably
 * where raw HTML scraping gets WAF-blocked. It's a Python tool, so this runs
 * wherever Python + yt-dlp exist — your machine, a VPS, or (the intended home)
 * a free GitHub Actions cron. The Vercel app never runs yt-dlp; it just reads
 * the snapshot this produces.
 *
 * Usage:
 *   TIKTOK_VIDEO_URLS="url1,url2" node scripts/collect-tiktok.mjs
 *
 * Env:
 *   TIKTOK_VIDEO_URLS  - comma/newline separated video URLs
 *   YTDLP_CMD          - override the yt-dlp command (default: "yt-dlp",
 *                        falls back to "python -m yt_dlp")
 *   TIKTOK_OUT         - output path (default: data/tiktok-views.json)
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const urls = (process.env.TIKTOK_VIDEO_URLS ?? "")
  .split(/[\n,]/)
  .map((s) => s.trim())
  .filter(Boolean);

const outPath = process.env.TIKTOK_OUT ?? "data/tiktok-views.json";

if (urls.length === 0) {
  console.error("No TIKTOK_VIDEO_URLS provided. Nothing to collect.");
  process.exit(1);
}

/** Resolve how to invoke yt-dlp: prefer the binary, fall back to the module. */
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

const PRINT = "%(id)s\t%(view_count)s\t%(timestamp)s\t%(uploader)s";

async function fetchOne(runner, url) {
  const args = [
    ...runner.base,
    "--no-warnings",
    "--skip-download",
    "--print",
    PRINT,
    url,
  ];
  const { stdout } = await run(runner.cmd, args, { timeout: 60_000 });
  const [id, views, ts, uploader] = stdout.trim().split("\t");
  return {
    id: id || url,
    url,
    uploader: uploader || null,
    views: Number(views) || 0,
    postedAt: ts && ts !== "NA" ? new Date(Number(ts) * 1000).toISOString() : null,
  };
}

async function main() {
  const runner = await resolveYtDlp();
  console.log(`Using: ${runner.cmd} ${runner.base.join(" ")}`.trim());

  const videos = [];
  for (const url of urls) {
    try {
      const v = await fetchOne(runner, url);
      videos.push(v);
      console.log(`  ok   ${v.views.toLocaleString()} views  ${url}`);
    } catch (err) {
      console.error(`  fail ${url}: ${err.message?.split("\n")[0]}`);
    }
  }

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
