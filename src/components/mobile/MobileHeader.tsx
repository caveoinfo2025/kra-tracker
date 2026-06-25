"use client";
import type { ReactNode } from "react";
import MIcon from "@/app/mobile/components/MIcon";

interface MobileHeaderProps {
  variant?: "shell" | "page";
  title?: string;
  eyebrow?: string;
  roleBadge?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  notificationDot?: boolean;
  onBell?: () => void;
}

/**
 * MobileHeader — dark "shell" top bar (brand + role badge + bell) for tab roots,
 * or a light "page" header with back button + title for drill-in screens.
 */
export default function MobileHeader({
  variant = "shell",
  title,
  eyebrow,
  roleBadge,
  onBack,
  rightSlot,
  notificationDot,
  onBell,
}: MobileHeaderProps) {
  if (variant === "page") {
    return (
      <div className="m-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {onBack && (
            <button className="back-btn" onClick={onBack} aria-label="Back">
              <MIcon name="back" size={17} />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            {eyebrow && <p className="m-eyebrow">{eyebrow}</p>}
            {title && <h1 className="m-title" style={{ fontSize: 21 }}>{title}</h1>}
          </div>
        </div>
        {rightSlot}
      </div>
    );
  }

  return (
    <div className="m-shell-header">
      <div className="brand">
        <span>CAVEO</span>
        <span className="dot">•</span>
      </div>
      <div className="actions">
        {roleBadge && <span className="role-badge">{roleBadge}</span>}
        {onBell && (
          <button className="icon-btn" onClick={onBell} aria-label="Notifications">
            <MIcon name="bell" size={16} color="#fff" />
            {notificationDot && <span className="dot-badge" />}
          </button>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
