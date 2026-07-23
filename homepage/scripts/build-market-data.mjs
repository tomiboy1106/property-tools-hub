import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const CURRENT_DATA_URL =
  "https://plvr.land.moi.gov.tw/Download?fileName=lvr_landcsv.zip&type=zip";
const SEASON_DATA_URL = (season) =>
  `https://plvr.land.moi.gov.tw/DownloadSeason?season=${season}&type=zip&fileName=lvr_landcsv.zip`;
const SOURCE_PAGE_URL = "https://data.gov.tw/dataset/77051";
const KCG_VOLUME_PAGE_URL = "https://landp.kcg.gov.tw/News_Content/2556/217874/";
const CACHE_DIR = path.join(process.cwd(), ".market-data-cache");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "kaohsiung-market-stats.json");
const KAOHSIUNG_MAIN_FILE = "e_lvr_land_a.csv";
const START_YEAR = 2015;
const START_ROC_YEAR = 104;
const PING_PER_SQUARE_METER = 0.3025;

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

async function downloadZip(name, url) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${name}.zip`);

  if (existsSync(cachePath)) {
    return readFile(cachePath);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${name} ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(cachePath, buffer);
  return buffer;
}

async function downloadFile(name, url) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, name);

  if (existsSync(cachePath)) {
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

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function parseSharedStrings(xml) {
  const matches = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];

  return matches.map((item) => {
    const textMatches = item.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? [];

    return textMatches.map((text) => decodeXml(text.replace(/<[^>]+>/g, ""))).join("");
  });
}

function parseSheetCells(xml, sharedStrings) {
  const cells = new Map();
  const matches = xml.match(/<c\b[\s\S]*?<\/c>|<c\b[^/>]*\/>/g) ?? [];

  for (const cell of matches) {
    const address = cell.match(/\br="([^"]+)"/)?.[1];
    const rawValue = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];

    if (!address || rawValue === undefined) {
      continue;
    }

    if (cell.includes('t="s"')) {
      cells.set(address, sharedStrings[Number(rawValue)] ?? "");
    } else {
      const numericValue = Number(rawValue);
      cells.set(address, Number.isFinite(numericValue) ? numericValue : rawValue);
    }
  }

  return cells;
}

function getCellText(cells, address) {
  return String(cells.get(address) ?? "").replace(/\s+/g, "");
}

function parseKcgRocMonth(value) {
  const match = value.match(/民國(\d+)年(\d+)月/);

  if (!match) {
    throw new Error("KCG volume report month was not found");
  }

  return `${Number(match[1]) + 1911}-${String(Number(match[2])).padStart(2, "0")}`;
}

function findKcgMonth(cells) {
  for (const value of cells.values()) {
    if (String(value).includes("民國")) {
      return parseKcgRocMonth(String(value));
    }
  }

  throw new Error("KCG volume report month was not found");
}

function parseKcgFileName(downloadUrl) {
  const encodedName = new URL(downloadUrl).searchParams.get("n");

  if (!encodedName) {
    return "高雄市不動產買賣交易類型件數統計.xlsx";
  }

  try {
    return Buffer.from(encodedName, "base64").toString("utf8");
  } catch {
    return "高雄市不動產買賣交易類型件數統計.xlsx";
  }
}

function parseKcgVolumeXlsx(buffer, sourceFileName) {
  const entries = unzipSync(new Uint8Array(buffer));
  const sharedStringsFile = entries["xl/sharedStrings.xml"];
  const sheetFile = entries["xl/worksheets/sheet1.xml"];

  if (!sharedStringsFile || !sheetFile) {
    throw new Error("KCG xlsx structure is not supported");
  }

  const sharedStrings = parseSharedStrings(strFromU8(sharedStringsFile));
  const cells = parseSheetCells(strFromU8(sheetFile), sharedStrings);
  const month = findKcgMonth(cells);
  let totalRow = 0;

  for (let row = 1; row <= 80; row += 1) {
    if (getCellText(cells, `A${row}`) === "總計") {
      totalRow = row;
      break;
    }
  }

  if (!totalRow) {
    throw new Error("KCG total row was not found");
  }

  return {
    month,
    total: Number(cells.get(`B${totalRow}`) ?? 0),
    land: Number(cells.get(`C${totalRow}`) ?? 0),
    townhouse: Number(cells.get(`D${totalRow}`) ?? 0),
    apartment: Number(cells.get(`E${totalRow}`) ?? 0),
    elevatorApartment: Number(cells.get(`F${totalRow}`) ?? 0),
    building: Number(cells.get(`G${totalRow}`) ?? 0),
    parking: Number(cells.get(`H${totalRow}`) ?? 0),
    other: Number(cells.get(`I${totalRow}`) ?? 0),
    sourceName: "高雄市政府地政局不動產買賣交易類型件數統計",
    sourceUrl: KCG_VOLUME_PAGE_URL,
    sourceFileName,
    generatedAt: new Date().toISOString(),
  };
}

async function fetchKcgVolumeStatistics() {
  const html = (await downloadFile("kcg-volume-page.html", KCG_VOLUME_PAGE_URL)).toString("utf8");
  const links = Array.from(html.matchAll(/href="([^"]*Download\.ashx[^"]*)"/g)).map((match) =>
    decodeHtml(match[1]),
  );
  const xlsxLink = links.find((link) => link.includes("Lnhsc3g") || link.includes(".xlsx"));

  if (!xlsxLink) {
    throw new Error("KCG xlsx download link was not found");
  }

  const downloadUrl = xlsxLink.startsWith("http") ? xlsxLink : new URL(xlsxLink, KCG_VOLUME_PAGE_URL).href;
  const sourceFileName = parseKcgFileName(downloadUrl);
  const xlsxBuffer = await downloadFile("kcg-volume-latest.xlsx", downloadUrl);

  return parseKcgVolumeXlsx(xlsxBuffer, sourceFileName);
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
    const currentBuffer = await downloadZip("current", CURRENT_DATA_URL);
    const didParse = await parseZip(currentBuffer, aggregates, latestClosedMonth);

    if (didParse) {
      processed.push("current");
    }
  } catch (error) {
    console.warn(`Skipped current: ${error.message}`);
  }

  const months = createMonthRange(`${START_YEAR}-01`, latestClosedMonth);
  const priceSeries = months.map((month) => {
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

  const volumeSeries = months.map((month) => ({
    month,
    apartment: aggregates.volume.get(month)?.apartment ?? 0,
    building: aggregates.volume.get(month)?.building ?? 0,
    elevatorApartment: aggregates.volume.get(month)?.elevatorApartment ?? 0,
    townhouse: aggregates.volume.get(month)?.townhouse ?? 0,
    land: aggregates.volume.get(month)?.land ?? 0,
  }));
  const latestVolumeStatistics = await fetchKcgVolumeStatistics();

  const output = {
    city: "高雄市",
    sourceName: "內政部不動產成交案件實際資訊資料供應系統",
    sourceUrl: SOURCE_PAGE_URL,
    generatedAt: new Date().toISOString(),
    periodStart: `${START_YEAR}-01`,
    periodEnd: latestClosedMonth,
    methodology:
      "平均單價取高雄市買賣案件主檔，住宅大樓、華廈、公寓、透天厝列入房屋均價，單價元/平方公尺換算為萬元/坪；成交量採高雄市政府地政局月報 Excel「總計」列，素地對應土地。",
    processedFiles: processed,
    priceSeries,
    volumeSeries,
    latestVolumeStatistics,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Months: ${output.periodStart} to ${output.periodEnd}`);
  console.log(`Processed files: ${processed.length}`);
}

await buildMarketData();
