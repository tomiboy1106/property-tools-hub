import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { refreshMarketStats } from "@/lib/market-statistics";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await refreshMarketStats();
  revalidatePath("/");

  return NextResponse.json({
    ok: true,
    stored: result.stored,
    periodEnd: result.stats.periodEnd,
    revalidated: true,
  });
}
