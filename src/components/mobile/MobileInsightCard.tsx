"use client";
import MIcon from "@/app/mobile/components/MIcon";

interface MobileInsightCardProps {
  tone?: "danger" | "info" | "warn" | "success";
  icon: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function MobileInsightCard({
  tone = "danger",
  icon,
  title,
  description,
  ctaLabel,
  onCta,
}: MobileInsightCardProps) {
  const toneClass = tone === "danger" ? "" : ` ${tone}`;
  return (
    <div className={`m-insight${toneClass}`}>
      <span className="ico">
        <MIcon name={icon} size={15} />
      </span>
      <div className="body">
        <div className="title">{title}</div>
        <div className="desc">{description}</div>
        {ctaLabel && (
          <button className="cta" onClick={onCta}>
            {ctaLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
