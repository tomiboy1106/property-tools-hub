import {
  ArrowRight,
  Banknote,
  Calculator,
  Check,
  ClipboardCheck,
  FileText,
  KeyRound,
  ListChecks,
  MousePointerClick,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { HeroVisual } from "@/components/hero-visual";
import { CompanyIdentity } from "@/components/company-identity";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ScrollToToolsButton } from "@/components/scroll-to-tools-button";
import { ToolCard } from "@/components/tool-card";
import { toolLinks } from "@/config/tool-links";

const steps = [
  {
    number: "01",
    title: "選擇工具",
    description: "根據你正在準備買房或賣房，選擇對應的試算。",
    icon: MousePointerClick,
  },
  {
    number: "02",
    title: "輸入資料",
    description: "依照畫面提示填入預算、貸款或房屋交易相關資訊。",
    icon: PencilLine,
  },
  {
    number: "03",
    title: "查看結果",
    description: "立即取得清楚的試算結果與重要數字整理。",
    icon: ClipboardCheck,
  },
];

const features = [
  {
    title: "簡單輸入",
    description: "不需要先理解複雜公式，依照提示填入已知資料即可。",
    icon: ListChecks,
  },
  {
    title: "即時計算",
    description: "調整輸入內容後，快速查看不同條件下的試算結果。",
    icon: Calculator,
  },
  {
    title: "清楚呈現",
    description: "將重要數字與估算依據整理成容易理解的結果。",
    icon: Sparkles,
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="company-intro" aria-label="公司資訊">
          <div className="site-container">
            <CompanyIdentity />
          </div>
        </section>
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
              <p className="section-kicker">選擇適合你的工具</p>
              <h2 id="tools-title">你現在準備做哪一件事？</h2>
              <p>依照目前的房產計畫，選擇適合你的試算工具。</p>
            </div>
            <div className="tools-grid">
              <ToolCard
                tone="green"
                label="我準備買房"
                title="自備款可購總價試算"
                description="輸入目前準備的自備款，快速估算可以負擔的房屋總價、預計貸款金額，以及應保留的購屋相關費用。"
                items={[
                  "估算可購房屋總價",
                  "推算貸款與自備款配置",
                  "納入常見購屋相關費用",
                ]}
                buttonLabel="計算可購總價"
                href={toolLinks.buyerBudget}
                icon={KeyRound}
              />
              <ToolCard
                tone="orange"
                label="我準備賣房"
                title="房地合一稅及財交稅試算"
                description="依照房屋取得、持有及出售資訊，初步估算房地合一所得稅或財產交易所得稅，提前了解交易可能產生的稅務成本。"
                items={[
                  "判斷可能適用的稅率",
                  "估算課稅所得與稅額",
                  "了解出售後的資金概況",
                ]}
                buttonLabel="開始試算售屋稅務"
                href={toolLinks.sellerNet}
                icon={FileText}
              />
            </div>
          </div>
        </section>

        <section className="section process-section" aria-labelledby="process-title">
          <div className="site-container">
            <div className="section-heading centered">
              <p className="section-kicker">使用方式</p>
              <h2 id="process-title">三個步驟，快速掌握房產數字</h2>
            </div>
            <ol className="steps-list">
              {steps.map((step, index) => (
                <li className="step-item" key={step.number}>
                  <div className="step-topline">
                    <span className="step-icon">
                      <step.icon size={23} aria-hidden="true" />
                    </span>
                    {index < steps.length - 1 && (
                      <span className="step-connector" aria-hidden="true">
                        <ArrowRight size={18} />
                      </span>
                    )}
                  </div>
                  <p className="step-number">STEP {step.number}</p>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="about" className="section features-section" aria-labelledby="features-title">
          <div className="site-container feature-layout">
            <div className="section-heading">
              <p className="section-kicker">為日常決策而設計</p>
              <h2 id="features-title">複雜的房產計算，也可以簡單一點</h2>
              <p>
                我們把繁瑣的條件整理成清楚的步驟，讓你先看懂數字，再決定下一步。
              </p>
            </div>
            <div className="feature-list">
              {features.map((feature) => (
                <article className="feature-item" key={feature.title}>
                  <span className="feature-icon">
                    <feature.icon size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="notice-section" aria-labelledby="notice-title">
          <div className="site-container">
            <aside className="notice-box">
              <span className="notice-icon">
                <Banknote size={25} aria-hidden="true" />
              </span>
              <div>
                <h2 id="notice-title">試算前請留意</h2>
                <p>
                  本平台提供的結果是依照使用者輸入資料及一般條件進行的初步估算，僅供財務規劃參考。實際稅額、貸款條件、鑑價結果及交易費用，仍應以主管機關、金融機構或專業人士的正式認定為準。
                </p>
              </div>
            </aside>
          </div>
        </section>

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
    </>
  );
}
