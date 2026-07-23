import { strFromU8, unzipSync } from "fflate";

const KCG_VOLUME_PAGE_URL = "https://landp.kcg.gov.tw/News_Content/2556/217874/";

export type KcgVolumeStatistics = {
  month: string;
  total: number;
  land: number;
  townhouse: number;
  apartment: number;
  elevatorApartment: number;
  building: number;
  parking: number;
  other: number;
  sourceName: string;
  sourceUrl: string;
  sourceFileName: string;
  generatedAt: string;
};

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function parseSharedStrings(xml: string) {
  const matches = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];

  return matches.map((item) => {
    const textMatches = item.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? [];

    return textMatches
      .map((text) => decodeXml(text.replace(/<[^>]+>/g, "")))
      .join("");
  });
}

function parseSheetCells(xml: string, sharedStrings: string[]) {
  const cells = new Map<string, string | number>();
  const matches = xml.match(/<c\b[\s\S]*?<\/c>|<c\b[^/>]*\/>/g) ?? [];

  for (const cell of matches) {
    const address = cell.match(/\br="([^"]+)"/)?.[1];

    if (!address) {
      continue;
    }

    const rawValue = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];

    if (rawValue === undefined) {
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

function getCellText(cells: Map<string, string | number>, address: string) {
  return String(cells.get(address) ?? "").replace(/\s+/g, "");
}

function parseRocMonth(value: string) {
  const match = value.match(/民國(\d+)年(\d+)月/);

  if (!match) {
    throw new Error("KCG volume report month was not found");
  }

  const year = Number(match[1]) + 1911;
  const month = Number(match[2]);

  return `${year}-${String(month).padStart(2, "0")}`;
}

function findReportMonth(cells: Map<string, string | number>) {
  for (const value of cells.values()) {
    if (String(value).includes("民國")) {
      return parseRocMonth(String(value));
    }
  }

  throw new Error("KCG volume report month was not found");
}

function findDownloadLink(html: string) {
  const links = Array.from(html.matchAll(/href="([^"]*Download\.ashx[^"]*)"/g)).map((match) =>
    decodeHtml(match[1]),
  );
  const xlsxLink = links.find((link) => link.includes("Lnhsc3g") || link.includes(".xlsx"));

  if (!xlsxLink) {
    throw new Error("KCG xlsx download link was not found");
  }

  return xlsxLink.startsWith("http") ? xlsxLink : new URL(xlsxLink, KCG_VOLUME_PAGE_URL).href;
}

function parseFileName(downloadUrl: string) {
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

export function parseKcgVolumeXlsx(buffer: ArrayBuffer, sourceFileName = ""): KcgVolumeStatistics {
  const entries = unzipSync(new Uint8Array(buffer));
  const sharedStringsFile = entries["xl/sharedStrings.xml"];
  const sheetFile = entries["xl/worksheets/sheet1.xml"];

  if (!sharedStringsFile || !sheetFile) {
    throw new Error("KCG xlsx structure is not supported");
  }

  const sharedStrings = parseSharedStrings(strFromU8(sharedStringsFile));
  const cells = parseSheetCells(strFromU8(sheetFile), sharedStrings);
  const month = findReportMonth(cells);
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

export async function fetchKcgVolumeStatistics() {
  const pageResponse = await fetch(KCG_VOLUME_PAGE_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`KCG volume page fetch failed: ${pageResponse.status}`);
  }

  const html = await pageResponse.text();
  const downloadUrl = findDownloadLink(html);
  const fileResponse = await fetch(downloadUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!fileResponse.ok) {
    throw new Error(`KCG xlsx fetch failed: ${fileResponse.status}`);
  }

  return parseKcgVolumeXlsx(await fileResponse.arrayBuffer(), parseFileName(downloadUrl));
}
