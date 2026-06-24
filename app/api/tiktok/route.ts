import { NextResponse } from "next/server";
import { getViews } from "@/lib/tiktok";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getViews();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
