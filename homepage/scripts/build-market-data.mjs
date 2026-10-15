import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { PDFParse } from "pdf-parse";

const CURRENT_DATA_URL =
  "https://plvr.land.moi.gov.tw/Download?fileName=lvr_landcsv.zip&type=zip";
const SEASON_DATA_URL = (season) =>
  `https://plvr.land.moi.gov.tw/DownloadSeason?season=${season}&type=zip&fileName=lvr_landcsv.zip`;
const SOURCE_PAGE_URL = "https://lvr.land.moi.gov.tw/";
const KCG_VOLUME_INDEX_URL = "https://landp.kcg.gov.tw/News/2556/";
const KCG_VOLUME_ORIGIN = "https://landp.kcg.gov.tw";
const KCG_BUILDING_TRANSFER_DATASET_URL = "https://data.gov.tw/dataset/177280";
const BUILDING_TRANSFER_REFERENCE_URL = "https://www.taiwanhouse.org.tw/a/blogs/show/3092702";
const KCG_BUILDING_TRANSFER_RESOURCE_PATTERN =
  /高雄市不動產買賣統計\((\d{3})年(\d{2})月\)","(https:\\u002F\\u002Fopenapi\.kcg\.gov\.tw\\u002FApi\\u002FService\\u002FGet\\u002F[0-9a-f-]+)"/gi;
const TARGET_REPORT_NAME = "高雄市不動產買賣交易類型件數統計";
const CACHE_DIR = path.join(process.cwd(), ".market-data-cache");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "kaohsiung-market-stats.json");
const KAOHSIUNG_MAIN_FILE = "e_lvr_land_a.csv";
const START_YEAR = 2015;
const START_ROC_YEAR = 104;
const PING_PER_SQUARE_METER = 0.3025;
const MIN_RELIABLE_PRICE_TRANSACTIONS = 800;

function getLatestClosedMonth(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const closed = new Date(Date.UTC(year, month - 1, 1));
  return `${closed.getUTCFullYear()}-${String(closed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getSeasons(latestClosedMonth) {
  const latestYear = Number(latestClosedMonth.slice(0, 4));
  const latestRocYear = latestYear - 1911;
  const seasons = [];

  for (let rocYear = START_ROC_YEAR; rocYear <= latestRocYear; rocYear += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      seasons.push(`${rocYear}S${quarter}`);
    }
  }

  return seasons;
}

function isZipBuffer(buffer) {
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

async function downloadZip(name, url, options = {}) {
  const useCache = options.useCache ?? true;
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${name}.zip`);

  if (useCache && existsSync(cachePath)) {
    const cachedBuffer = await readFile(cachePath);

    if (isZipBuffer(cachedBuffer)) {
      return cachedBuffer;
    }

    console.warn(`Ignoring invalid cached zip: ${name}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${name} ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (isZipBuffer(buffer)) {
    await writeFile(cachePath, buffer);
  }

  return buffer;
}

async function downloadFile(name, url, useCache = true) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, name);

  if (useCache && existsSync(cachePath)) {
    return readFile(cachePath);
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${name} ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(cachePath, buffer);
  return buffer;
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function rocMonthToIsoMonth(rocYear, month) {
  return `${rocYear + 1911}-${String(month).padStart(2, "0")}`;
}

function toNumber(value) {
  if (value === "-") {
    return 0;
  }

  return Number(value.replaceAll(",", ""));
}

function parseReportPdfLink(filesHtml) {
  const normalizedHtml = filesHtml
    .replaceAll('\\"', '"')
    .replaceAll("\\/", "/")
    .replaceAll("\\r", "\r")
    .replaceAll("\\n", "\n");
  const match = normalizedHtml.match(
    /<a[^>]*href="([^"]+)"[^>]*class="pdf"[^>]*>([^<]*)<\/a>/,
  );

  if (!match) {
    return null;
  }

  return {
    pdfUrl: decodeHtml(match[1]),
    pdfFileName: decodeHtml(match[2]).trim() || "高雄市不動產買賣交易類型件數統計.pdf",
  };
}

function parseReportCandidates(html) {
  const reports = [];
  const reportRegex =
    /\{"年":"(\d+)年","月":"(\d+)月","報表名稱":"([^"]+)"[\s\S]*?"Path":"([^"]+)"[\s\S]*?"FilesHtml_ShowFileName":"([\s\S]*?)","FilesHtml_Info"/g;

  for (const match of html.matchAll(reportRegex)) {
    if (match[3] !== TARGET_REPORT_NAME) {
      continue;
    }

    const pdf = parseReportPdfLink(match[5]);

    if (!pdf) {
      continue;
    }

    reports.push({
      rocYear: Number(match[1]),
      month: Number(match[2]),
      path: match[4],
      ...pdf,
    });
  }

  return reports.sort((first, second) => {
    return second.rocYear - first.rocYear || second.month - first.month;
  });
}

function parseKcgVolumePdfText(text, candidate) {
  const totalLine = text.match(
    /總\s*計\s+([0-9,]+|-)\s+([0-9,]+|-)\s+([0-9,]+|-)\s+([0-9,]+|-)\s+([0-9,]+|-)\s+([0-9,]+|-)\s+([0-9,]+|-)\s+([0-9,]+|-)/,
  );

  if (!totalLine) {
    throw new Error("KCG PDF total row was not found");
  }

  return {
    month: rocMonthToIsoMonth(candidate.rocYear, candidate.month),
    total: toNumber(totalLine[1]),
    land: toNumber(totalLine[2]),
    townhouse: toNumber(totalLine[3]),
    apartment: toNumber(totalLine[4]),
    elevatorApartment: toNumber(totalLine[5]),
    building: toNumber(totalLine[6]),
    parking: toNumber(totalLine[7]),
    other: toNumber(totalLine[8]),
    sourceName: "高雄市政府地政局不動產買賣交易類型件數統計 PDF",
    sourceUrl: candidate.pdfUrl,
    sourceFileName: candidate.pdfFileName,
    generatedAt: new Date().toISOString(),
  };
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: Buffer.from(buffer) });

  try {
    const result = await parser.getText();

    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function fetchKcgVolumeStatistics() {
  const html = (await downloadFile("kcg-volume-index.html", KCG_VOLUME_INDEX_URL, false)).toString("utf8");
  const latestReport = parseReportCandidates(html)[0];

  if (!latestReport) {
    throw new Error("KCG latest PDF report was not found");
  }

  const pdfUrl = latestReport.pdfUrl.startsWith("http")
    ? latestReport.pdfUrl
    : new URL(latestReport.pdfUrl, KCG_VOLUME_ORIGIN).href;
  const pdfBuffer = await downloadFile(
    `kcg-volume-${latestReport.rocYear}-${String(latestReport.month).padStart(2, "0")}.pdf`,
    pdfUrl,
    false,
  );
  const pdfText = await extractPdfText(pdfBuffer);

  return parseKcgVolumePdfText(pdfText, {
    ...latestReport,
    pdfUrl,
  });
}

async function fetchKcgBuildingTransferStatistics() {
  const response = await fetch(KCG_BUILDING_TRANSFER_DATASET_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`KCG building transfer dataset fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const resources = Array.from(html.matchAll(KCG_BUILDING_TRANSFER_RESOURCE_PATTERN), (match) => ({
    month: `${Number(match[1]) + 1911}-${match[2]}`,
    dataUrl: match[3].replaceAll("\\u002F", "/"),
  })).sort((first, second) => second.month.localeCompare(first.month));
  const latestResource = resources[0];

  if (!latestResource) {
    throw new Error("KCG latest building transfer resource was not found");
  }

  const dataResponse = await fetch(latestResource.dataUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!dataResponse.ok) {
    throw new Error(`KCG building transfer data fetch failed: ${dataResponse.status}`);
  }

  const payload = await dataResponse.json();
  const total = payload.data?.reduce((sum, row) => sum + Number(row["建物棟數"] ?? 0), 0) ?? 0;

  if (!payload.success || total <= 0) {
    throw new Error("KCG building transfer data was empty or invalid");
  }

  return {
    city: "高雄市",
    month: latestResource.month,
    total,
    sourceName: "高雄市政府地政局不動產買賣統計",
    sourceUrl: KCG_BUILDING_TRANSFER_DATASET_URL,
    sourceDataUrl: latestResource.dataUrl,
    referenceName: "內政部全國建物買賣移轉棟數統計資料頁",
    referenceUrl: BUILDING_TRANSFER_REFERENCE_URL,
    unit: "棟",
    updatedAt: new Date().toISOString(),
    note: "高雄市各行政區建物棟數加總；產品分類月報另依高雄市政府地政局最新公告月份呈現。",
  };
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
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

function rocDateToMonth(value) {
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

function getCategory(transactionType, buildingType) {
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

function createMonthRange(startMonth, endMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const months = [];
  let cursor = new Date(Date.UTC(startYear, startMonthNumber - 1, 1));
  const end = new Date(Date.UTC(endYear, endMonthNumber - 1, 1));

  while (cursor <= end) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return months;
}

function getReliablePriceEndMonth(priceSeries) {
  const reliable = [...priceSeries]
    .reverse()
    .find((item) => item.averagePricePerPing !== null && item.transactions >= MIN_RELIABLE_PRICE_TRANSACTIONS);

  if (!reliable) {
    throw new Error("No reliable price month was found");
  }

  return reliable.month;
}

function parseMarketCsv(csvText, aggregates, endMonth) {
  const rows = parseCsv(csvText);
  const header = rows[0];
  const transactionTypeIndex = header.indexOf("交易標的");
  const tradeDateIndex = header.indexOf("交易年月日");
  const buildingTypeIndex = header.indexOf("建物型態");
  const unitPriceIndex = header.indexOf("單價元平方公尺");
  const serialNumberIndex = header.indexOf("編號");

  for (const row of rows.slice(2)) {
    const serialNumber = row[serialNumberIndex] ?? "";

    if (serialNumber && aggregates.seenSerialNumbers.has(serialNumber)) {
      continue;
    }

    const month = rocDateToMonth(row[tradeDateIndex] ?? "");

    if (!month || month < `${START_YEAR}-01` || month > endMonth) {
      continue;
    }

    if (serialNumber) {
      aggregates.seenSerialNumbers.add(serialNumber);
    }

    const transactionType = row[transactionTypeIndex] ?? "";
    const buildingType = row[buildingTypeIndex] ?? "";
    const category = getCategory(transactionType, buildingType);

    if (!aggregates.volume.has(month)) {
      aggregates.volume.set(month, {
        apartment: 0,
        building: 0,
        elevatorApartment: 0,
        townhouse: 0,
        land: 0,
      });
    }

    if (category) {
      aggregates.volume.get(month)[category] += 1;
    }

    if (category && category !== "land") {
      const unitPricePerSquareMeter = Number(row[unitPriceIndex]);

      if (Number.isFinite(unitPricePerSquareMeter) && unitPricePerSquareMeter > 0) {
        const pricePerPingWan = (unitPricePerSquareMeter / PING_PER_SQUARE_METER) / 10000;
        const priceAggregate = aggregates.price.get(month) ?? { sum: 0, count: 0 };
        priceAggregate.sum += pricePerPingWan;
        priceAggregate.count += 1;
        aggregates.price.set(month, priceAggregate);
      }
    }
  }
}

async function parseZip(buffer, aggregates, endMonth) {
  const entries = unzipSync(new Uint8Array(buffer));
  const file = entries[KAOHSIUNG_MAIN_FILE];

  if (!file) {
    return false;
  }

  parseMarketCsv(strFromU8(file), aggregates, endMonth);
  return true;
}

async function buildMarketData() {
  const latestClosedMonth = getLatestClosedMonth();
  const seasons = getSeasons(latestClosedMonth);
  const aggregates = {
    price: new Map(),
    volume: new Map(),
    seenSerialNumbers: new Set(),
  };
  const processed = [];

  for (const season of seasons) {
    try {
      const buffer = await downloadZip(season, SEASON_DATA_URL(season));
      const didParse = await parseZip(buffer, aggregates, latestClosedMonth);

      if (didParse) {
        processed.push(season);
      }
    } catch (error) {
      console.warn(`Skipped ${season}: ${error.message}`);
    }
  }

  try {
    const currentBuffer = await downloadZip("current", CURRENT_DATA_URL, { useCache: false });
    const didParse = await parseZip(currentBuffer, aggregates, latestClosedMonth);

    if (didParse) {
      processed.push("current");
    }
  } catch (error) {
    console.warn(`Skipped current: ${error.message}`);
  }

  const months = createMonthRange(`${START_YEAR}-01`, latestClosedMonth);
  const rawPriceSeries = months.map((month) => {
    const aggregate = aggregates.price.get(month);

    return {
      month,
      averagePricePerPing:
        aggregate && aggregate.count > 0
          ? Number((aggregate.sum / aggregate.count).toFixed(2))
          : null,
      transactions: aggregate?.count ?? 0,
    };
  });
  const reliablePriceEndMonth = getReliablePriceEndMonth(rawPriceSeries);
  const priceSeries = rawPriceSeries.filter((item) => item.month <= reliablePriceEndMonth);
  const excludedIncompletePriceMonths = rawPriceSeries
    .filter((item) => item.month > reliablePriceEndMonth)
    .map((item) => ({
      month: item.month,
      averagePricePerPing: item.averagePricePerPing,
      transactions: item.transactions,
      reason: `樣本數低於 ${MIN_RELIABLE_PRICE_TRANSACTIONS} 筆，暫不列入平均單價圖表`,
    }));

  const volumeSeries = months.map((month) => ({
    month,
    apartment: aggregates.volume.get(month)?.apartment ?? 0,
    building: aggregates.volume.get(month)?.building ?? 0,
    elevatorApartment: aggregates.volume.get(month)?.elevatorApartment ?? 0,
    townhouse: aggregates.volume.get(month)?.townhouse ?? 0,
    land: aggregates.volume.get(month)?.land ?? 0,
  }));
  const [latestVolumeStatistics, latestBuildingTransfer] = await Promise.all([
    fetchKcgVolumeStatistics(),
    fetchKcgBuildingTransferStatistics(),
  ]);

  const output = {
    city: "高雄市",
    sourceName: "內政部不動產成交案件實際資訊資料供應系統",
    sourceUrl: SOURCE_PAGE_URL,
    generatedAt: new Date().toISOString(),
    periodStart: `${START_YEAR}-01`,
    periodEnd: reliablePriceEndMonth,
    rawDataPeriodEnd: latestClosedMonth,
    minimumReliablePriceTransactions: MIN_RELIABLE_PRICE_TRANSACTIONS,
    methodology:
      "平均單價取內政部實價登錄高雄市買賣案件主檔，住宅大樓、華廈、公寓、透天厝列入房屋均價，單價元/平方公尺換算為萬元/坪；最新月份若樣本數低於 800 筆，視為揭露尚未完整，暫不列入平均單價圖表；產品分類採高雄市政府地政局不動產買賣交易類型月報 PDF，素地對應土地。",
    processedFiles: processed,
    priceSeries,
    excludedIncompletePriceMonths,
    volumeSeries,
    latestBuildingTransfer,
    latestVolumeStatistics,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Months: ${output.periodStart} to ${output.periodEnd}`);
  console.log(`Processed files: ${processed.length}`);
}

await buildMarketData();
