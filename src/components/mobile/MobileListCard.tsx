"use client";
import type { ReactNode } from "react";

interface MobileListCardProps {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  accentTop?: boolean;
  trailing?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}

export default function MobileListCard({
  title,
  subtitle,
  meta,
  accentTop = false,
  trailing,
  footer,
  onClick,
  children,
}: MobileListCardProps) {
  return (
    <div
      className={`m-list-card${accentTop ? " accent-top" : ""}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="lc-head">
        <div style={{ minWidth: 0 }}>
          <div className="lc-title">{title}</div>
          {subtitle && <div className="lc-sub">{subtitle}</div>}
        </div>
        {trailing}
      </div>
      {meta && <div className="lc-meta">{meta}</div>}
      {children}
      {footer && <div className="lc-foot">{footer}</div>}
    </div>
  );
}
