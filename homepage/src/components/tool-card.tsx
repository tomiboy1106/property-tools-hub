import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type ToolCardProps = {
  tone: "green" | "orange";
  label: string;
  title: string;
  description: string;
  items: string[];
  buttonLabel: string;
  href: string;
  icon: LucideIcon;
};

export function ToolCard({
  tone,
  label,
  title,
  description,
  items,
  buttonLabel,
  href,
  icon: Icon,
}: ToolCardProps) {
  return (
    <article className={`tool-card ${tone}`}>
      <span className="tool-card-icon">
        <Icon size={27} aria-hidden="true" />
      </span>
      <p className="tool-label">{label}</p>
      <h3>{title}</h3>
      <p className="tool-description">{description}</p>
      <ul className="tool-points">
        {items.map((item) => (
          <li key={item}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <a className="tool-button" href={href}>
        {buttonLabel}
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </article>
  );
}
