import { getRedis } from "@/lib/redis";

export type RealEstateNewsItem = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
};

const NEWS_CACHE_KEY = "juhong:homepage:real-estate-news:v3";
const NEWS_REVALIDATE_SECONDS = 60 * 60;
const NEWS_STALE_AFTER_MS = 48 * 60 * 60 * 1000;
const LTN_NEWS_PAGES = [
  "https://estate.ltn.com.tw/news",
  "https://estate.ltn.com.tw/thinking",
  "https://estate.ltn.com.tw/",
];
const NEXT_APPLE_PROPERTY_PAGE = "https://news.nextapple.com/realtime/property";
const NEXT_APPLE_PROPERTY_RSS = "https://news.nextapple.com/api/rss/category/property";

const fallbackNews: RealEstateNewsItem[] = [
  {
    title: "橋科利多再爆發！高雄新市鎮三期拍板 新案逼近5字頭",
    summary: "高雄新市鎮第三期開發案推進，橋頭科學園區周邊房市與生活圈發展持續受到關注。",
    source: "自由時報地產天下",
    url: "https://estate.ltn.com.tw/article/28489",
    publishedAt: "2026-07-23",
  },
  {
    title: "營建成本狂飆！建商喊「不蓋了」都更危老恐掀停擺潮",
    summary: "營建與人力成本上升，牽動全台都更危老案推動節奏，也影響後續供給與產品價格判斷。",
    source: "自由時報地產天下",
    url: "https://estate.ltn.com.tw/article/28490",
    publishedAt: "2026-07-22",
  },
  {
    title: "這項修法「保護租客」恐成最大傷害！專家：最後苦的還是租屋族",
    summary: "租賃政策與修法方向牽動全台租屋市場，後續仍須觀察房東供給、租客保障與市場成本變化。",
    source: "自由時報地產天下",
    url: "https://estate.ltn.com.tw/article/28488",
    publishedAt: "2026-07-22",
  },
];

const KAOHSIUNG_KEYWORDS = [
  "高雄",
  "橋頭",
  "橋科",
  "楠梓",
  "左營",
  "鼓山",
  "苓雅",
  "前鎮",
  "小港",
  "鳳山",
  "仁武",
  "大寮",
  "大社",
  "岡山",
  "鳥松",
  "三民",
  "新興",
  "前金",
  "鹽埕",
  "旗津",
  "林園",
  "亞灣",
  "農十六",
  "美術館",
  "澄清湖",
  "五甲",
  "南高雄",
  "北高雄",
];

const NATIONWIDE_KEYWORDS = [
  "全台",
  "全國",
  "台灣",
  "六都",
  "央行",
  "內政部",
  "財政部",
  "國稅局",
  "行政院",
  "立法院",
  "修法",
  "住宅政策",
  "租賃",
  "租客",
  "租屋族",
  "租金補貼",
  "社宅",
  "新青安",
  "限貸",
  "信用管制",
  "房貸",
  "利率",
  "房地合一",
  "囤房稅",
  "房屋稅",
  "地價稅",
  "營建成本",
  "空屋",
  "老屋",
  "買房族",
  "首購",
  "都更危老",
  "房價所得比",
];

const OTHER_LOCAL_MARKET_KEYWORDS = [
  "台中",
  "臺中",
  "北屯",
  "西屯",
  "七期",
  "新北",
  "淡水",
  "淡海",
  "林口",
  "三重",
  "板橋",
  "新店",
  "樹林",
  "土城",
  "中和",
  "永和",
  "汐止",
  "三峽",
  "鶯歌",
  "台北",
  "臺北",
  "北市",
  "雙北",
  "桃園",
  "青埔",
  "藝文",
  "龜山",
  "大園",
  "八德",
  "中壢",
  "新竹",
  "竹北",
  "台南",
  "臺南",
  "嘉義",
  "雲林",
  "彰化",
  "苗栗",
  "宜蘭",
  "花蓮",
  "台東",
  "臺東",
  "屏東",
  "基隆",
  "南投",
  "澎湖",
  "金門",
  "馬祖",
];

const OVERSEAS_MARKET_KEYWORDS = [
  "日本",
  "赴日",
  "日圓",
  "東京",
  "大阪",
  "海外",
  "香港",
  "中國",
  "美國",
  "東南亞",
];

function decodeEntities(value: string) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, "").replace(/[｜|:：!-]/g, "").toLowerCase();
}

function normalizeNewsText(value: string) {
  return value.replace(/[\s，。！？、；：「」『』（）()【】\-]/g, "").toLowerCase();
}

function getTextSimilarity(first: string, second: string) {
  const firstText = normalizeNewsText(first);
  const secondText = normalizeNewsText(second);

  if (firstText.length < 12 || secondText.length < 12) {
    return 0;
  }

  const getChunks = (value: string) => {
    const chunks = new Set<string>();

    for (let index = 0; index <= value.length - 3; index += 1) {
      chunks.add(value.slice(index, index + 3));
    }

    return chunks;
  };
  const firstChunks = getChunks(firstText);
  const secondChunks = getChunks(secondText);
  const sharedCount = [...firstChunks].filter((chunk) => secondChunks.has(chunk)).length;

  return sharedCount / Math.min(firstChunks.size, secondChunks.size);
}

function removeDuplicateNews(items: RealEstateNewsItem[]) {
  return items.filter((item, index, allItems) =>
    allItems.slice(0, index).every((existingItem) =>
      normalizeTitle(existingItem.title) !== normalizeTitle(item.title) &&
      getTextSimilarity(existingItem.summary, item.summary) < 0.62,
    ),
  );
}

function formatPublishedAt(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  })
    .format(date)
    .replaceAll("/", "-");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readJsonString(html: string, key: string) {
  const match = html.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));

  if (!match) {
    return "";
  }

  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return decodeEntities(match[1]);
  }
}

function readXmlTag(xml: string, tagName: string) {
  const escapedTagName = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escapedTagName}[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i"));

  return stripHtml(match?.[1] ?? "");
}

function trimSummary(value: string) {
  return value.length > 88 ? `${value.slice(0, 88)}…` : value;
}

function getPublishedTime(value: string) {
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T23:59:59+08:00`
    : value;
  const time = new Date(normalizedValue).getTime();

  return Number.isFinite(time) ? time : 0;
}

function isKaohsiungNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  const text = `${item.title} ${item.summary}`;

  return KAOHSIUNG_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isNationwideNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  const text = `${item.title} ${item.summary}`;

  return NATIONWIDE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isNationwideHeadline(item: Pick<RealEstateNewsItem, "title">) {
  return NATIONWIDE_KEYWORDS.some((keyword) => item.title.includes(keyword));
}

function isOtherLocalTitle(item: Pick<RealEstateNewsItem, "title">) {
  return OTHER_LOCAL_MARKET_KEYWORDS.some((keyword) => item.title.includes(keyword));
}

function isOtherLocalNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  const text = `${item.title} ${item.summary}`;

  return OTHER_LOCAL_MARKET_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isOverseasMarketNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  const text = `${item.title} ${item.summary}`;

  return OVERSEAS_MARKET_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isAllowedNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  if (isOverseasMarketNews(item)) {
    return false;
  }

  if (isKaohsiungNews(item)) {
    return true;
  }

  if (!isNationwideNews(item)) {
    return false;
  }

  if (isOtherLocalTitle(item)) {
    return false;
  }

  return !isOtherLocalNews(item) || isNationwideHeadline(item);
}

function newsPriority(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  if (isKaohsiungNews(item)) {
    return 2;
  }

  if (isNationwideNews(item)) {
    return 1;
  }

  return 0;
}

function compareNews(first: RealEstateNewsItem, second: RealEstateNewsItem) {
  const publishedDifference = getPublishedTime(second.publishedAt) - getPublishedTime(first.publishedAt);

  if (publishedDifference !== 0) {
    return publishedDifference;
  }

  return newsPriority(second) - newsPriority(first);
}

function getNewsFreshness(items: RealEstateNewsItem[]) {
  const newestItem = [...items].sort(compareNews)[0];
  const newestPublishedTime = newestItem ? getPublishedTime(newestItem.publishedAt) : 0;

  return {
    newestPublishedAt: newestItem?.publishedAt || null,
    stale:
      newestPublishedTime === 0 ||
      Date.now() - newestPublishedTime > NEWS_STALE_AFTER_MS,
  };
}

function parseLtnListPage(html: string, pageUrl: string) {
  const cards = html.match(/<li class="listbox"[\s\S]*?<\/li>/gi) ?? [];

  return cards
    .map((card) => {
      const href = card.match(/href="([^"]+)"/i)?.[1] ?? "";
      const title = stripHtml(card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? card.match(/title="([^"]+)"/i)?.[1] ?? "");
      const summary = stripHtml(card.match(/<p class="listnews_word">([\s\S]*?)<\/p>/i)?.[1] ?? "");
      const url = href ? new URL(href, pageUrl).href : "";

      return {
        title,
        summary: trimSummary(summary),
        source: "自由時報地產天下",
        url,
        publishedAt: "",
      };
    })
    .filter((item) => item.title && item.url);
}

function parseNextAppleRss(xml: string) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items
    .map((item) => {
      const title = readXmlTag(item, "title");
      const summary = readXmlTag(item, "description");
      const url = readXmlTag(item, "link");
      const publishedAt = formatPublishedAt(readXmlTag(item, "pubDate"));

      return {
        title,
        summary: trimSummary(summary),
        source: "壹蘋新聞網",
        url,
        publishedAt,
      };
    })
    .filter((item) => item.title && item.url);
}

async function fetchArticleDetail(item: RealEstateNewsItem) {
  if (item.source === "壹蘋新聞網") {
    return item;
  }

  try {
    const response = await fetchWithTimeout(item.url, {
      next: { revalidate: NEWS_REVALIDATE_SECONDS },
      headers: {
        "user-agent": "Mozilla/5.0 JuhongHomepage/1.0",
      },
    }, 6000);

    if (!response.ok) {
      return item;
    }

    const html = await response.text();
    const headline = stripHtml(readJsonString(html, "headline"));
    const description = stripHtml(readJsonString(html, "description"));
    const publishedAt = formatPublishedAt(readJsonString(html, "datePublished"));

    return {
      ...item,
      title: headline || item.title,
      summary: trimSummary(description || item.summary),
      publishedAt: publishedAt || item.publishedAt,
    };
  } catch {
    return item;
  }
}

async function fetchLtnNews() {
  const results = await Promise.allSettled(
    LTN_NEWS_PAGES.map(async (pageUrl) => {
      const response = await fetchWithTimeout(pageUrl, {
        next: { revalidate: NEWS_REVALIDATE_SECONDS },
        headers: {
          "user-agent": "Mozilla/5.0 JuhongHomepage/1.0",
        },
      }, 8000);

      if (!response.ok) {
        throw new Error(`News page fetch failed: ${response.status}`);
      }

      return parseLtnListPage(await response.text(), pageUrl);
    }),
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchNextAppleNews() {
  const response = await fetchWithTimeout(NEXT_APPLE_PROPERTY_RSS, {
    next: { revalidate: NEWS_REVALIDATE_SECONDS },
    headers: {
      referer: NEXT_APPLE_PROPERTY_PAGE,
      "user-agent": "Mozilla/5.0 JuhongHomepage/1.0",
    },
  }, 8000);

  if (!response.ok) {
    throw new Error(`Next Apple RSS fetch failed: ${response.status}`);
  }

  return parseNextAppleRss(await response.text());
}

async function fetchNewsFromPages() {
  const results = await Promise.allSettled(
    [fetchNextAppleNews(), fetchLtnNews()],
  );

  const seen = new Set<string>();
  const filteredCandidates = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => {
      const key = normalizeTitle(item.title);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return isAllowedNews(item);
    });
  const candidates = [
    ...filteredCandidates
      .filter((item) => getPublishedTime(item.publishedAt) > 0)
      .sort(compareNews)
      .slice(0, 12),
    ...filteredCandidates
      .filter((item) => getPublishedTime(item.publishedAt) === 0)
      .sort((first, second) => newsPriority(second) - newsPriority(first))
      .slice(0, 12),
  ];
  const enriched = await Promise.all(candidates.map(fetchArticleDetail));

  return removeDuplicateNews(enriched.filter(isAllowedNews).sort(compareNews)).slice(0, 3);
}

function mergeWithFallback(news: RealEstateNewsItem[]) {
  const seen = new Set<string>();

  return [...news, ...fallbackNews]
    .filter(isAllowedNews)
    .filter((item) => {
      const key = normalizeTitle(item.title);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

export async function refreshRealEstateNews() {
  const news = await fetchNewsFromPages();
  const safeNews = mergeWithFallback(news).sort(compareNews);
  const freshness = getNewsFreshness(safeNews);
  const redis = getRedis();

  if (redis) {
    await redis.set(NEWS_CACHE_KEY, safeNews);
  }

  return {
    items: safeNews,
    stored: Boolean(redis),
    ...freshness,
  };
}

export async function getRealEstateNews() {
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get<RealEstateNewsItem[]>(NEWS_CACHE_KEY);

    if (cached?.length) {
      const safeCachedNews = cached.filter(isAllowedNews).sort(compareNews).slice(0, 3);

      if (safeCachedNews.length >= 3) {
        return safeCachedNews;
      }
    }
  }

  try {
    return (await refreshRealEstateNews()).items;
  } catch {
    return fallbackNews;
  }
}
