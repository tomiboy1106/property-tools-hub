import { strFromU8, unzipSync } from "fflate";
import marketStats from "@/data/kaohsiung-market-stats.json";
import { getRedis } from "@/lib/redis";

export type MarketStats = typeof marketStats;
type KcgVolumeStatistics = MarketStats["latestVolumeStatistics"];

type VolumeCategory = "apartment" | "building" | "elevatorApartment" | "townhouse" | "land";

const CURRENT_DATA_URL =
  "https://plvr.land.moi.gov.tw/Download?fileName=lvr_landcsv.zip&type=zip";
const MARKET_STATS_CACHE_KEY = "juhong:homepage:kaohsiung-market-stats";
const KAOHSIUNG_MAIN_FILE = "e_lvr_land_a.csv";
const PING_PER_SQUARE_METER = 0.3025;
function getLatestClosedMonth(now = new Date()) {
  const closed = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));

  return `${closed.getUTCFullYear()}-${String(closed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function decodeCsvRows(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function rocDateToMonth(value: string) {
  if (!/^\d{6,7}$/.test(value)) {
    return null;
  }

  const rawYear = value.length === 7 ? value.slice(0, 3) : value.slice(0, 2);
  const rawMonth = value.length === 7 ? value.slice(3, 5) : value.slice(2, 4);
  const year = Number(rawYear) + 1911;
  const month = Number(rawMonth);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function getCategory(transactionType: string, buildingType: string): VolumeCategory | null {
  if (transactionType === "土地") {
    return "land";
  }

  if (buildingType.includes("住宅大樓")) {
    return "building";
  }

  if (buildingType.includes("華廈")) {
    return "elevatorApartment";
  }

  if (buildingType.includes("公寓")) {
    return "apartment";
  }

  if (buildingType.includes("透天")) {
    return "townhouse";
  }

  return null;
}

async function fetchCurrentMonthStats(targetMonth: string) {
  const response = await fetch(CURRENT_DATA_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`MOI data fetch failed: ${response.status}`);
  }

  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const csvFile = entries[KAOHSIUNG_MAIN_FILE];

  if (!csvFile) {
    throw new Error("Kaohsiung CSV not found in MOI zip");
  }

  const rows = decodeCsvRows(strFromU8(csvFile));
  const header = rows[0];
  const transactionTypeIndex = header.indexOf("交易標的");
  const tradeDateIndex = header.indexOf("交易年月日");
  const buildingTypeIndex = header.indexOf("建物型態");
  const unitPriceIndex = header.indexOf("單價元平方公尺");
  const serialNumberIndex = header.indexOf("編號");
  const seen = new Set<string>();
  const volume = {
    apartment: 0,
    building: 0,
    elevatorApartment: 0,
    townhouse: 0,
    land: 0,
  };
  let priceSum = 0;
  let priceCount = 0;

  for (const row of rows.slice(2)) {
    const month = rocDateToMonth(row[tradeDateIndex] ?? "");
    const serialNumber = row[serialNumberIndex] ?? "";

    if (month !== targetMonth || (serialNumber && seen.has(serialNumber))) {
      continue;
    }

    if (serialNumber) {
      seen.add(serialNumber);
    }

    const category = getCategory(row[transactionTypeIndex] ?? "", row[buildingTypeIndex] ?? "");

    if (category) {
      volume[category] += 1;
    }

    if (category && category !== "land") {
      const unitPricePerSquareMeter = Number(row[unitPriceIndex]);

      if (Number.isFinite(unitPricePerSquareMeter) && unitPricePerSquareMeter > 0) {
        priceSum += (unitPricePerSquareMeter / PING_PER_SQUARE_METER) / 10000;
        priceCount += 1;
      }
    }
  }

  return {
    price: {
      month: targetMonth,
      averagePricePerPing: priceCount > 0 ? Number((priceSum / priceCount).toFixed(2)) : null,
      transactions: priceCount,
    },
    volume: {
      month: targetMonth,
      ...volume,
    },
  };
}

async function getStoredMarketStats(): Promise<MarketStats> {
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get<MarketStats>(MARKET_STATS_CACHE_KEY);

    if (cached?.priceSeries?.length && cached?.latestVolumeStatistics) {
      return cached;
    }
  }

  return marketStats;
}

async function fetchLatestVolumeStatistics(): Promise<KcgVolumeStatistics> {
  const { fetchKcgVolumeStatistics } = await import("@/lib/kcg-volume-statistics");

  return fetchKcgVolumeStatistics();
}

function buildNextMarketStats(
  currentStats: MarketStats,
  targetMonth: string,
  latest: Awaited<ReturnType<typeof fetchCurrentMonthStats>>,
  latestVolumeStatistics: KcgVolumeStatistics,
) {
  const priceSeries = currentStats.priceSeries.filter((item) => item.month !== targetMonth);

  return {
    ...currentStats,
    generatedAt: new Date().toISOString(),
    periodEnd: targetMonth,
    priceSeries: [...priceSeries, latest.price],
    latestVolumeStatistics,
  };
}

export async function getMarketStats(): Promise<MarketStats> {
  return getStoredMarketStats();
}

export async function refreshMarketStats() {
  const targetMonth = getLatestClosedMonth();
  const [latest, latestVolumeStatistics] = await Promise.all([
    fetchCurrentMonthStats(targetMonth),
    fetchLatestVolumeStatistics(),
  ]);
  const currentStats = await getStoredMarketStats();
  const nextStats = buildNextMarketStats(currentStats, targetMonth, latest, latestVolumeStatistics);
  const redis = getRedis();

  if (redis) {
    await redis.set(MARKET_STATS_CACHE_KEY, nextStats);
  }

  return {
    stats: nextStats,
    stored: Boolean(redis),
  };
}
