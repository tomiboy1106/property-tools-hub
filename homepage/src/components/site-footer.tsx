import { Phone } from "lucide-react";
import { CompanyIdentity } from "@/components/company-identity";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container company-footer">
        <CompanyIdentity compact />
        <div className="company-contact">
          <p>感謝您的使用，如有疑問歡迎來電</p>
          <a href="tel:077779365" aria-label="撥打岠鋐不動產事業電話 07-7779365">
            <Phone size={15} aria-hidden="true" />
            (07)-7779365
          </a>
        </div>
        <p className="footer-copyright">
          © {new Date().getFullYear()} 岠鋐不動產事業
        </p>
      </div>
    </footer>
  );
}
