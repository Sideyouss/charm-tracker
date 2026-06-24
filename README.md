# Charm — Goal Tracker

A single screen that shows your team two numbers in real time, against the
goals you're chasing:

- **Money** — revenue generated so far vs. your objective (via RevenueCat)
- **Reach** — views in the last 30 days vs. your target (via TikTok)

It runs on realistic demo data out of the box, so you can see it working in
under a minute, then swap in live credentials when you're ready.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `.env.local`, it shows demo numbers that
drift over the day so the UI feels alive.

## Go live

Copy `.env.example` to `.env.local` and fill in what you have.

### Money (RevenueCat)

1. RevenueCat dashboard → **Project settings → API keys** → create a **v2
   secret key**. Put it in `REVENUECAT_V2_API_KEY`.
2. Copy your project id (the long id in the dashboard URL) into
   `REVENUECAT_PROJECT_ID`.
3. The overview metrics endpoint reports **trailing-28-day** revenue, not an
   all-time lifetime total. To show "generated so far", set `REVENUE_BASELINE`
   to whatever you'd already earned before connecting this — the live 28-day
   number is added on top.

### Reach (TikTok views) — the automatic part

TikTok has no free public "total views" API, and scraping the page HTML is
blocked from servers (TikTok serves a WAF "Please wait..." challenge instead of
the real page). The reliable, free, keyless route uses **yt-dlp**, which reads
view counts via TikTok's signed mobile API. yt-dlp is a Python tool and can't
run inside Vercel functions, so a GitHub Action runs it and the app reads the
result.

List your posted videos in `TIKTOK_VIDEO_URLS` (comma or newline separated) —
that's your content "script" the tracker counts — and pick a provider with
`TIKTOK_PROVIDER`:

- **`snapshot`** (recommended) — reads a JSON snapshot of view counts produced
  by `scripts/collect-tiktok.mjs` (yt-dlp). In production a GitHub Action
  refreshes it on a schedule; the app reads it via `TIKTOK_SNAPSHOT_URL`. See
  "Automate TikTok views" below. Locally: `npm run collect:tiktok` then run the
  app with `TIKTOK_PROVIDER=snapshot`.
- **`html`** — fetches each page and reads `playCount` from the embedded JSON.
  No deps, but TikTok's WAF blocks datacenter IPs, so it rarely works on Vercel.
- **`scraper`** — a third-party TikTok scraper (e.g. RapidAPI). Paid, but its
  servers handle the anti-bot problem. Set `TIKTOK_SCRAPER_*`.
- **`official`** — TikTok for Developers "Query Videos" API. Needs an approved
  app + OAuth token (`TIKTOK_ACCESS_TOKEN`). Only sees your own account's videos.
- **`demo`** (default until configured) — realistic generated data.

**What "30-day views" means here:** the dashboard sums the view counts of
videos **posted in the last 30 days** (configurable via `GOALS.views.windowDays`).
yt-dlp reports each video's lifetime view count, so this is "reach of your
recent content," not a true rolling 30-day-of-activity figure (which only
TikTok's own analytics exposes). For a team posting fresh content, it tracks the
number you care about.

### Automate TikTok views (free, no key)

1. Push this repo to GitHub.
2. In **Settings → Secrets and variables → Actions → Variables**, add a variable
   `TIKTOK_VIDEO_URLS` with your comma-separated video URLs.
3. The workflow in `.github/workflows/collect-tiktok.yml` runs every 30 minutes
   (and on demand from the Actions tab), runs yt-dlp, and commits the snapshot
   to a `data` branch as `tiktok-views.json`.
4. In Vercel, set
   `TIKTOK_SNAPSHOT_URL=https://raw.githubusercontent.com/<you>/<repo>/data/tiktok-views.json`
   and `TIKTOK_PROVIDER=snapshot`. The app reads fresh numbers without redeploying.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add the same env vars under **Project → Settings → Environment Variables**.
4. Deploy. Share the URL with the team. (Add Vercel password protection if you
   want it private.)

Secret keys live only in server-side API routes (`app/api/*`), never in the
browser bundle.

## Tune the goals & branding

Two ways to change goals:

**1. Live, from the dashboard (recommended).** Click **Edit goals**, change the
team name, tagline, revenue objective, currency, views target, or window, enter
the edit password, and save. Changes go live for everyone with no redeploy.

- Set `GOALS_EDIT_PASSWORD` to enable the editor (without it, editing is
  disabled and the dashboard is read-only).
- Saved goals need a shared store. On Vercel, add the **KV / Upstash**
  integration — it injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`
  automatically. Locally, edits fall back to `data/store.json`, so it just works
  with `npm run dev`.

**2. Defaults in code.** `lib/config.ts` holds the starting values used until
someone edits them, plus the static labels and `REFRESH_INTERVAL_MS`.

## How it fits together

```
app/page.tsx          ambient background + mounts the dashboard
components/Dashboard   client: polls both APIs, renders the two goal cards
components/GoalCard     one metric: animated counter + progress + sub-stats
app/api/revenue        server: RevenueCat overview metrics
app/api/tiktok         server: picks a TikTok provider, sums 30-day views
lib/revenuecat.ts      RevenueCat fetch + baseline math
lib/tiktok/*           provider interface + snapshot / html / scraper / official / demo
lib/config.ts          goals, branding, refresh rate
scripts/collect-tiktok.mjs   yt-dlp collector → data/tiktok-views.json snapshot
.github/workflows/collect-tiktok.yml   cron that runs the collector & publishes
```
