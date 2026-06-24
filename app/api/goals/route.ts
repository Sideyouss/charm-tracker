import { NextResponse } from "next/server";
import { getGoals, saveGoals } from "@/lib/goals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const goals = await getGoals();
  return NextResponse.json(goals, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const required = process.env.GOALS_EDIT_PASSWORD;
  if (!required) {
    return NextResponse.json(
      { error: "Editing is disabled. Set GOALS_EDIT_PASSWORD to enable it." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supplied = req.headers.get("x-goals-password") ?? body.password;
  if (typeof supplied !== "string" || !safeEqual(supplied, required)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const goals = await saveGoals({
    team: body.team as string,
    tagline: body.tagline as string,
    revenueTarget: body.revenueTarget as number,
    currency: body.currency as string,
    viewsTarget: body.viewsTarget as number,
    windowDays: body.windowDays as number,
  });

  return NextResponse.json(goals, { headers: { "Cache-Control": "no-store" } });
}

/** Length-independent comparison so we don't leak the password via timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
