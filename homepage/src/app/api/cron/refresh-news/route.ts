import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { refreshRealEstateNews } from "@/lib/real-estate-news";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await refreshRealEstateNews();
  revalidatePath("/");

  return NextResponse.json(
    {
      ok: !result.stale,
      stored: result.stored,
      count: result.items.length,
      newestPublishedAt: result.newestPublishedAt,
      stale: result.stale,
      revalidated: true,
    },
    { status: result.stale ? 503 : 200 },
  );
}
