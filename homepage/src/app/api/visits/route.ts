import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

const VISIT_COUNTER_BASE = 15367;
const VISIT_COUNTER_KEY = "juhong-homepage-visit-count";

export async function GET() {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json({
      count: VISIT_COUNTER_BASE,
      source: "local-fallback",
    });
  }

  try {
    await redis.set(VISIT_COUNTER_KEY, VISIT_COUNTER_BASE, { nx: true });
    const count = await redis.incr(VISIT_COUNTER_KEY);

    return NextResponse.json({
      count,
      source: "database",
    });
  } catch {
    return NextResponse.json(
      {
        count: VISIT_COUNTER_BASE,
        source: "local-fallback",
      },
      { status: 200 },
    );
  }
}
