import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  HandCoins,
} from "lucide-react";
import Image from "next/image";

export function HeroVisual() {
  return (
    <div className="hero-visual" aria-label="房屋、計算機與買賣方向的示意圖">
      <div className="visual-backdrop" aria-hidden="true" />
      <div className="house-illustration" aria-hidden="true">
        <Image
          className="company-exterior-image"
          src="/images/company-exterior.jpg"
          alt="岠鋐不動產事業公司外觀"
          fill
          sizes="(max-width: 700px) 78vw, (max-width: 900px) 480px, 390px"
          priority
        />
      </div>
      <div className="finance-card card-price" aria-hidden="true">
        <HandCoins size={24} />
        <span>
          <strong>新臺幣預算</strong>
          <small>先掌握可負擔範圍</small>
        </span>
      </div>
      <div className="finance-card card-calc" aria-hidden="true">
        <Calculator size={25} />
        <span>
          <strong>快速試算</strong>
          <small>重要數字清楚整理</small>
        </span>
      </div>
      <div className="finance-card card-direction" aria-hidden="true">
        <span className="direction-row">
          買房規劃
          <ArrowUpRight className="buy-arrow" size={18} />
        </span>
        <span className="direction-row">
          賣房稅務
          <ArrowDownRight className="sell-arrow" size={18} />
        </span>
      </div>
    </div>
  );
}
