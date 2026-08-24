import { getRedis } from "@/lib/redis";

export type RealEstateNewsItem = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
};

const NEWS_CACHE_KEY = "juhong:homepage:real-estate-news";
const NEWS_REVALIDATE_SECONDS = 60 * 60;
const NEWS_PAGES = [
  "https://estate.ltn.com.tw/news",
  "https://estate.ltn.com.tw/thinking",
  "https://estate.ltn.com.tw/",
];

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
  "嘉義",
  "雲林",
  "彰化",
  "苗栗",
  "宜蘭",
  "花蓮",
  "台東",
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

function trimSummary(value: string) {
  return value.length > 88 ? `${value.slice(0, 88)}…` : value;
}

function isKaohsiungNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  const text = `${item.title} ${item.summary}`;

  return KAOHSIUNG_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isNationwideNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
  const text = `${item.title} ${item.summary}`;

  return NATIONWIDE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isOtherLocalOnlyNews(item: Pick<RealEstateNewsItem, "title" | "summary">) {
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

  return !isOtherLocalOnlyNews(item);
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

async function fetchArticleDetail(item: RealEstateNewsItem) {
  try {
    const response = await fetch(item.url, {
      next: { revalidate: NEWS_REVALIDATE_SECONDS },
      headers: {
        "user-agent": "Mozilla/5.0 JuhongHomepage/1.0",
      },
    });

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

async function fetchNewsFromPages() {
  const results = await Promise.allSettled(
    NEWS_PAGES.map(async (pageUrl) => {
      const response = await fetch(pageUrl, {
        next: { revalidate: NEWS_REVALIDATE_SECONDS },
        headers: {
          "user-agent": "Mozilla/5.0 JuhongHomepage/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`News page fetch failed: ${response.status}`);
      }

      return parseLtnListPage(await response.text(), pageUrl);
    }),
  );

  const seen = new Set<string>();
  const candidates = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => {
      const key = normalizeTitle(item.title);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return isAllowedNews(item);
    })
    .sort((first, second) => newsPriority(second) - newsPriority(first))
    .slice(0, 8);
  const enriched = await Promise.all(candidates.map(fetchArticleDetail));

  return enriched
    .filter(isAllowedNews)
    .sort((first, second) => {
      const priorityDifference = newsPriority(second) - newsPriority(first);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime();
    })
    .slice(0, 3);
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
  const safeNews = mergeWithFallback(news);
  const redis = getRedis();

  if (redis) {
    await redis.set(NEWS_CACHE_KEY, safeNews);
  }

  return {
    items: safeNews,
    stored: Boolean(redis),
  };
}

export async function getRealEstateNews() {
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get<RealEstateNewsItem[]>(NEWS_CACHE_KEY);

    if (cached?.length) {
      const safeCachedNews = cached.filter(isAllowedNews).slice(0, 3);

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
