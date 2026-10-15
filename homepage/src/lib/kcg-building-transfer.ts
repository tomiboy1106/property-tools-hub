const DATASET_PAGE_URL = "https://data.gov.tw/dataset/177280";
const REFERENCE_PAGE_URL = "https://www.taiwanhouse.org.tw/a/blogs/show/3092702";
const RESOURCE_PATTERN =
  /高雄市不動產買賣統計\((\d{3})年(\d{2})月\)","(https:\\u002F\\u002Fopenapi\.kcg\.gov\.tw\\u002FApi\\u002FService\\u002FGet\\u002F[0-9a-f-]+)"/gi;

type KcgBuildingTransferResponse = {
  success: boolean;
  data?: Array<Record<string, string>>;
};

function decodeSerializedUrl(value: string) {
  return value.replaceAll("\\u002F", "/");
}

function getLatestResource(html: string) {
  const resources = Array.from(html.matchAll(RESOURCE_PATTERN), (match) => ({
    month: `${Number(match[1]) + 1911}-${match[2]}`,
    dataUrl: decodeSerializedUrl(match[3]),
  }));

  return resources.sort((first, second) => second.month.localeCompare(first.month))[0];
}

export async function fetchLatestKcgBuildingTransfer() {
  const pageResponse = await fetch(DATASET_PAGE_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "JuhongHomepage/1.0",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`KCG building transfer dataset fetch failed: ${pageResponse.status}`);
  }

  const latestResource = getLatestResource(await pageResponse.text());

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

  const payload = (await dataResponse.json()) as KcgBuildingTransferResponse;
  const total = payload.data?.reduce((sum, row) => sum + Number(row["建物棟數"] ?? 0), 0) ?? 0;

  if (!payload.success || total <= 0) {
    throw new Error("KCG building transfer data was empty or invalid");
  }

  return {
    city: "高雄市",
    month: latestResource.month,
    total,
    sourceName: "高雄市政府地政局不動產買賣統計",
    sourceUrl: DATASET_PAGE_URL,
    sourceDataUrl: latestResource.dataUrl,
    referenceName: "內政部全國建物買賣移轉棟數統計資料頁",
    referenceUrl: REFERENCE_PAGE_URL,
    unit: "棟",
    updatedAt: new Date().toISOString(),
    note: "高雄市各行政區建物棟數加總；產品分類月報另依高雄市政府地政局最新公告月份呈現。",
  };
}
