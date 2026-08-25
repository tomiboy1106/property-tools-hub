import { ExternalLink, Newspaper } from "lucide-react";
import { getRealEstateNews } from "@/lib/real-estate-news";

export async function RealEstateNewsSection() {
  const news = await getRealEstateNews();

  return (
    <section id="news" className="section news-section" aria-labelledby="news-title">
      <div className="site-container">
        <div className="section-heading centered">
          <p className="section-kicker">房地產新聞</p>
          <h2 id="news-title">每天掌握市場正在發生的事</h2>
          <p>精選近期台灣不動產新聞，保留原文連結，讓你需要時可以回到新聞來源完整閱讀。</p>
        </div>
        <div className="news-grid">
          {news.map((item) => (
            <article className="news-card" key={item.url}>
              <div className="news-card-top">
                <span className="news-icon">
                  <Newspaper size={19} aria-hidden="true" />
                </span>
                <span>{item.publishedAt || "近期"}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`閱讀原新聞：${item.title}`}
              >
                原新聞連結
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
        <p className="news-source-note">
          新聞來源：壹蘋新聞網地產王、自由時報地產天下等公開新聞頁面；本站僅整理高雄或全台性不動產新聞標題與簡短重點，不轉載新聞全文。
        </p>
      </div>
    </section>
  );
}
