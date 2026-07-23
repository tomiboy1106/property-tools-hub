import { Calculator, House } from "lucide-react";

type BrandProps = {
  footer?: boolean;
};

export function Brand({ footer = false }: BrandProps) {
  return (
    <span className={footer ? "brand footer-brand" : "brand"}>
      <span className="brand-mark" aria-hidden="true">
        <House size={23} strokeWidth={2.1} />
        <span className="mini-calculator">
          <Calculator size={10} strokeWidth={2.5} />
        </span>
      </span>
      <span className="brand-text">
        <strong>岠鋐不動產官方網站</strong>
        <small>提供稅務、自備款試算、房市新聞最佳輔助</small>
      </span>
    </span>
  );
}
