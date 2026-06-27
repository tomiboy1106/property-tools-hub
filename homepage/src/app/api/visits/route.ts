import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const VISIT_COUNTER_BASE = 15367;
const VISIT_COUNTER_KEY = "juhong-homepage-visit-count";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

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
