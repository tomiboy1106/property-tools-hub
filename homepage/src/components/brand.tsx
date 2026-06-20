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
        <strong>房地產財務規劃</strong>
        <small>買賣房產，把數字先算清楚</small>
      </span>
    </span>
  );
}
