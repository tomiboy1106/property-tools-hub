import { PDFParse } from "pdf-parse";

const KCG_VOLUME_INDEX_URL = "https://landp.kcg.gov.tw/News/2556/";
const KCG_VOLUME_ORIGIN = "https://landp.kcg.gov.tw";
const TARGET_REPORT_NAME = "高雄市不動產買賣交易類型件數統計";

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

type ReportCandidate = {
  rocYear: number;
  month: number;
  path: string;
  pdfUrl: string;
  pdfFileName: string;
};

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function rocMonthToIsoMonth(rocYear: number, month: number) {
  return `${rocYear + 1911}-${String(month).padStart(2, "0")}`;
}

function toNumber(value: string) {
  if (value === "-") {
    return 0;
  }

  return Number(value.replaceAll(",", ""));
}

function parseReportPdfLink(filesHtml: string) {
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

function parseReportCandidates(html: string) {
  const reports: ReportCandidate[] = [];
  const reportRegex =
    /\{"年":"(\d+)年","月":"(\d+)月","報表名稱":"([^"]+)"[\s\S]*?"Path":"([^"]+)"[\s\S]*?"FilesHtml_ShowFileName":"([\s\S]*?)","FilesHtml_Info"/g;

  for (const match of html.matchAll(reportRegex)) {
    const reportName = match[3];

    if (reportName !== TARGET_REPORT_NAME) {
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

export function parseKcgVolumePdfText(
  text: string,
  candidate: Pick<ReportCandidate, "rocYear" | "month" | "pdfUrl" | "pdfFileName">,
): KcgVolumeStatistics {
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

async function extractPdfText(buffer: ArrayBuffer) {
  const parser = new PDFParse({ data: Buffer.from(buffer) });

  try {
    const result = await parser.getText();

    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function fetchKcgVolumeStatistics() {
  const pageResponse = await fetch(KCG_VOLUME_INDEX_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`KCG volume index fetch failed: ${pageResponse.status}`);
  }

  const html = await pageResponse.text();
  const latestReport = parseReportCandidates(html)[0];

  if (!latestReport) {
    throw new Error("KCG latest PDF report was not found");
  }

  const pdfUrl = latestReport.pdfUrl.startsWith("http")
    ? latestReport.pdfUrl
    : new URL(latestReport.pdfUrl, KCG_VOLUME_ORIGIN).href;
  const fileResponse = await fetch(pdfUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!fileResponse.ok) {
    throw new Error(`KCG PDF fetch failed: ${fileResponse.status}`);
  }

  const pdfText = await extractPdfText(await fileResponse.arrayBuffer());

  return parseKcgVolumePdfText(pdfText, {
    ...latestReport,
    pdfUrl,
  });
}
