import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Tiny key/value store with two backends:
 *   - Vercel KV / Upstash Redis (REST) when KV_REST_API_URL + KV_REST_API_TOKEN
 *     are set. This is what production uses — Vercel's filesystem is read-only,
 *     so edits must live in a shared store.
 *   - A local data/store.json file otherwise, so `npm run dev` just works.
 *
 * Values are opaque strings (we store JSON). Uses the Upstash REST command
 * endpoint so no SDK dependency is needed.
 */
const FILE = join(process.cwd(), "data", "store.json");

// Accept either naming convention: Vercel KV (KV_REST_API_*) or the Upstash
// Redis integration (UPSTASH_REDIS_REST_*). Whichever is set, we use it.
function kvCreds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function hasKv(): boolean {
  return kvCreds() !== null;
}

async function kvCommand(args: string[]): Promise<unknown> {
  const creds = kvCreds();
  if (!creds) throw new Error("No KV credentials configured");
  const res = await fetch(creds.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV responded ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result ?? null;
}

export async function kvGet(key: string): Promise<string | null> {
  if (hasKv()) {
    const result = await kvCommand(["GET", key]);
    return typeof result === "string" ? result : null;
  }
  try {
    const obj = JSON.parse(await readFile(FILE, "utf8")) as Record<string, string>;
    return obj[key] ?? null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (hasKv()) {
    await kvCommand(["SET", key, value]);
    return;
  }
  let obj: Record<string, string> = {};
  try {
    obj = JSON.parse(await readFile(FILE, "utf8")) as Record<string, string>;
  } catch {
    /* file may not exist yet */
  }
  obj[key] = value;
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(obj, null, 2));
}
