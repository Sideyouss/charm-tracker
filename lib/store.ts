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

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(args: string[]): Promise<unknown> {
  const res = await fetch(process.env.KV_REST_API_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
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
