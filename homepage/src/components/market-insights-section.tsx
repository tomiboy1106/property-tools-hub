import { BarChart3 } from "lucide-react";
import { MarketPriceChart } from "@/components/market-price-chart";
import { getMarketStats } from "@/lib/market-statistics";

const volumeCategories = [
  { key: "apartment", label: "公寓", color: "#233C0D", note: "5樓含以下無電梯" },
  { key: "elevatorApartment", label: "華廈", color: "#E9A33B", note: "10層含以下有電梯" },
  { key: "building", label: "大樓", color: "#FFD110", note: "住宅大樓，11層含以上有電梯" },
  { key: "townhouse", label: "透天", color: "#5f6f39", note: "建物型態為透天厝" },
  { key: "land", label: "土地", color: "#9b8765", note: "交易標的為土地" },
] as const;

type VolumePoint = {
  month: string;
  total: number;
  apartment: number;
  building: number;
  elevatorApartment: number;
  townhouse: number;
  land: number;
  parking?: number;
  other?: number;
  sourceName?: string;
  sourceUrl?: string;
  sourceFileName?: string;
};

type BuildingTransferPoint = {
  month: string;
  total: number;
  sourceUrl: string;
  referenceUrl: string;
  unit: string;
};

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}/${Number(monthNumber)}`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  })
    .format(new Date(value))
    .replaceAll("/", "-");
}

function LatestVolumeBars({
  latest,
  buildingTransfer,
}: {
  latest: VolumePoint;
  buildingTransfer: BuildingTransferPoint;
}) {
  const values = volumeCategories.map((category) => ({
    ...category,
    value: Number(latest[category.key]),
  }));
  const max = Math.max(...values.map((item) => item.value), 1);
  const total = latest.total || values.reduce((sum, item) => sum + item.value, 0);

  return (
    <figure className="market-chart-card latest-volume-card">
      <figcaption>
        <span className="market-chart-icon">
          <BarChart3 size={19} aria-hidden="true" />
        </span>
        <div>
          <h3>{formatMonth(buildingTransfer.month)} 建物買賣移轉量</h3>
          <p>
            依建物買賣移轉登記統計，呈現高雄市最新市場量體。
          </p>
        </div>
      </figcaption>
      <div
        className="latest-transfer-summary"
        aria-label={`${formatMonth(buildingTransfer.month)} 高雄市建物買賣移轉 ${buildingTransfer.total} 棟`}
      >
        <div>
          <strong>{buildingTransfer.total.toLocaleString("zh-TW")}</strong>
          <span>{buildingTransfer.unit}</span>
        </div>
        <p>高雄市政府地政局最新官方資料</p>
      </div>
      <div className="latest-volume-period">
        <strong>{formatMonth(latest.month)} 產品分類</strong>
        <span>高雄市地政局最新已公布資料，共 {total.toLocaleString("zh-TW")} 件</span>
      </div>
      <div className="latest-volume-bars" role="img" aria-label={`${formatMonth(latest.month)} 高雄市不動產成交量五分類柱狀圖`}>
        {values.map((item) => (
          <div className="latest-volume-item" key={item.key}>
            <div className="latest-volume-bar-shell">
              <span
                className="latest-volume-bar"
                style={{
                  height: `${Math.max(8, (item.value / max) * 100)}%`,
                  backgroundColor: item.color,
                }}
                aria-hidden="true"
              />
            </div>
            <strong>{item.value.toLocaleString("zh-TW")}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="latest-volume-extra">
        <span>車位 {latest.parking?.toLocaleString("zh-TW") ?? 0} 筆</span>
        <span>其他 {latest.other?.toLocaleString("zh-TW") ?? 0} 筆</span>
      </div>
      <p className="market-category-note">
        分類備註：
        {volumeCategories.map((category) => `${category.label}＝${category.note}`).join("；")}。
      </p>
    </figure>
  );
}

export async function MarketInsightsSection() {
  const stats = await getMarketStats();
  const latestVolume = stats.latestVolumeStatistics;
  const latestBuildingTransfer = stats.latestBuildingTransfer;

  return (
    <section id="market" className="section market-section" aria-labelledby="market-title">
      <div className="site-container">
        <div className="market-heading">
          <div className="section-heading">
            <p className="section-kicker">官方市場資料</p>
            <h2 id="market-title">高雄市不動產交易趨勢</h2>
            <p>
              依內政部不動產交易實價登錄批次資料整理平均單價與最新月份成交量，協助客戶快速掌握市場方向。
            </p>
          </div>
          <div className="market-source-box">
            <span>資料更新</span>
            <strong>{formatUpdatedAt(stats.generatedAt)}</strong>
            <a href={stats.sourceUrl} target="_blank" rel="noopener noreferrer">
              內政部資料來源
            </a>
            {latestVolume?.sourceUrl && (
              <a href={latestVolume.sourceUrl} target="_blank" rel="noopener noreferrer">
                產品分類月報來源
              </a>
            )}
            <a href={latestBuildingTransfer.sourceUrl} target="_blank" rel="noopener noreferrer">
              9 月官方移轉資料
            </a>
            <a href={latestBuildingTransfer.referenceUrl} target="_blank" rel="noopener noreferrer">
              全國移轉統計參考
            </a>
          </div>
        </div>
        <div className="market-chart-grid">
          <MarketPriceChart data={stats.priceSeries} />
          {latestVolume && latestBuildingTransfer && (
            <LatestVolumeBars latest={latestVolume} buildingTransfer={latestBuildingTransfer} />
          )}
        </div>
        <p className="market-method-note">
          {stats.methodology} 建物移轉總量與產品分類來自不同統計表，月份依各來源最新公告分別標示，兩者不直接相加比較。
        </p>
      </div>
    </section>
  );
}
