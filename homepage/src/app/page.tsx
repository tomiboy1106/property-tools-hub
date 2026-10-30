import {
  Banknote,
  Calculator,
  Check,
  FileText,
  KeyRound,
} from "lucide-react";
import { HeroVisual } from "@/components/hero-visual";
import { CompanyIdentity } from "@/components/company-identity";
import { LineFloatingWidget } from "@/components/line-floating-widget";
import { MarketInsightsSection } from "@/components/market-insights-section";
import { RealEstateNewsSection } from "@/components/real-estate-news-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ScrollToToolsButton } from "@/components/scroll-to-tools-button";
import { TeamIntroduction } from "@/components/team-introduction";
import { ToolCard } from "@/components/tool-card";
import { toolLinks } from "@/config/tool-links";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="company-intro" aria-label="公司資訊">
          <div className="site-container">
            <CompanyIdentity />
          </div>
        </section>
        <TeamIntroduction />
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <Calculator size={15} aria-hidden="true" />
                岠鋐團隊不動產財務試算
              </div>
              <h1 id="hero-title">
                房產重大決定，
                <span>先把數字算清楚</span>
              </h1>
              <p className="hero-description">
                買房前，估算自備款能負擔的房屋總價；賣房前，試算可能產生的房地合一稅。用簡單清楚的方式，提前掌握預算與成本。
              </p>
              <div className="hero-actions">
                <ScrollToToolsButton />
                <p className="trust-note" aria-label="免註冊、免費使用、即時計算">
                  <Check size={17} aria-hidden="true" />
                  免註冊・免費使用・即時計算
                </p>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section id="tools" className="section tools-section" aria-labelledby="tools-title">
          <div className="site-container">
            <div className="section-heading centered">
              <p className="section-kicker">快速試算入口</p>
              <h2 id="tools-title">你現在準備做哪一件事？</h2>
              <p>兩個工具各自對應買房與賣房前最常遇到的金流問題。</p>
            </div>
            <div className="tools-grid">
              <ToolCard
                tone="green"
                label="我準備買房"
                title="自備款可購總價試算"
                description="用目前自備款估算可負擔總價、貸款金額與購屋費用。"
                buttonLabel="計算可購總價"
                href={toolLinks.buyerBudget}
                icon={KeyRound}
              />
              <ToolCard
                tone="orange"
                label="我準備賣房"
                title="房地合一稅及財交稅試算"
                description="出售前先估算可能稅額，提前整理交易後資金概況。"
                buttonLabel="開始試算售屋稅務"
                href={toolLinks.sellerNet}
                icon={FileText}
              />
            </div>
            <aside className="tools-inline-notice" aria-labelledby="tools-notice-title">
              <span className="notice-icon">
                <Banknote size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 id="tools-notice-title">試算前請留意</h3>
                <p>
                  本平台提供的結果是依照使用者輸入資料及一般條件進行的初步估算，僅供財務規劃參考。實際稅額、貸款條件、鑑價結果及交易費用，仍應以主管機關、金融機構或專業人士的正式認定為準。
                </p>
              </div>
            </aside>
          </div>
        </section>

        <MarketInsightsSection />

        <RealEstateNewsSection />

        <section className="closing-section" aria-labelledby="closing-title">
          <div className="site-container closing-card">
            <div>
              <p className="section-kicker">從重要的第一步開始</p>
              <h2 id="closing-title">準備好把房產數字算清楚了嗎？</h2>
            </div>
            <ScrollToToolsButton position="closing" />
          </div>
        </section>
      </main>
      <SiteFooter />
      <LineFloatingWidget />
    </>
  );
}
