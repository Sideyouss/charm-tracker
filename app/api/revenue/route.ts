import { NextResponse } from "next/server";
import { getRevenue } from "@/lib/revenuecat";

// Always run fresh on the server; never statically cache the secret-keyed call.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getRevenue();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
