import { kvGet, kvSet } from "./store";
import { DEFAULT_GOALS, sanitize, type GoalsConfig } from "./goals-shared";

export { DEFAULT_GOALS, type GoalsConfig } from "./goals-shared";

const STORE_KEY = "goals";

export async function getGoals(): Promise<GoalsConfig> {
  const stored = await kvGet(STORE_KEY);
  if (!stored) return DEFAULT_GOALS;
  try {
    return sanitize({ ...DEFAULT_GOALS, ...JSON.parse(stored) });
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveGoals(input: Partial<GoalsConfig>): Promise<GoalsConfig> {
  const current = await getGoals();
  const next = sanitize({ ...current, ...input });
  await kvSet(STORE_KEY, JSON.stringify(next));
  return next;
}
