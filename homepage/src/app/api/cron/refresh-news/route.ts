import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { refreshRealEstateNews } from "@/lib/real-estate-news";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await refreshRealEstateNews();

  return NextResponse.json({
    ok: true,
    stored: result.stored,
    count: result.items.length,
  });
}
