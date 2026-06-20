import Image from "next/image";

type CompanyIdentityProps = {
  compact?: boolean;
};

export function CompanyIdentity({ compact = false }: CompanyIdentityProps) {
  return (
    <div className={compact ? "company-identity compact" : "company-identity"}>
      <span className="company-logo-shell">
        <Image
          className="company-logo"
          src="/images/company-logo.png"
          alt="岠鋐團隊 Logo"
          width={900}
          height={1200}
          priority={!compact}
        />
      </span>
      <div className="company-identity-copy">
        <p>JU HONG TEAM</p>
        <strong>岠鋐不動產事業</strong>
      </div>
    </div>
  );
}
