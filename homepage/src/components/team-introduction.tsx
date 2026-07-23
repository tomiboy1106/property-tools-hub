import { BadgeCheck, Handshake, Megaphone, ShieldCheck } from "lucide-react";

const strengths = [
  {
    title: "網路行銷",
    description: "讓物件在買方搜尋路徑中更容易被看見。",
    icon: Megaphone,
  },
  {
    title: "產品包裝銷售",
    description: "整理屋況、亮點與出價策略，提升房屋呈現價值。",
    icon: BadgeCheck,
  },
  {
    title: "交易風險控管",
    description: "事前評估稅務與貸款條件，減少交易變數。",
    icon: ShieldCheck,
  },
];

export function TeamIntroduction() {
  return (
    <section id="team" className="team-section" aria-labelledby="team-title">
      <div className="site-container team-card">
        <div className="team-copy">
          <p className="section-kicker">岠鋐不動產事業</p>
          <h2 id="team-title">我們是東高雄精品房仲團隊</h2>
          <p>
            擅長網路行銷、產品包裝銷售與房屋價值提升，並透過稅法試算與買方貸款條件事前評估，協助客戶降低不動產交易風險，完成更清楚、穩健的交易體驗。
          </p>
        </div>
        <div className="team-strengths" aria-label="團隊服務重點">
          {strengths.map((item) => (
            <article className="team-strength" key={item.title}>
              <span className="team-strength-icon">
                <item.icon size={20} aria-hidden="true" />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="team-note">
          <Handshake size={18} aria-hidden="true" />
          <span>從行銷曝光、買方條件到稅務成本，讓交易前的每一步都更有依據。</span>
        </div>
      </div>
    </section>
  );
}
