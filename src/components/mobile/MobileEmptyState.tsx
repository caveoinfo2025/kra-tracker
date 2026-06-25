"use client";
import MIcon from "@/app/mobile/components/MIcon";

interface MobileEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "error";
}

export default function MobileEmptyState({
  icon = "shield",
  title,
  description,
  actionLabel,
  onAction,
  tone = "neutral",
}: MobileEmptyStateProps) {
  const isError = tone === "error";
  return (
    <div className="m-empty">
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: isError ? "var(--caveo-red-50)" : "var(--bg-muted)",
          color: isError ? "var(--caveo-red)" : "var(--fg-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <MIcon name={icon} size={24} />
      </div>
      <div className="m-empty-title">{title}</div>
      {description && <div className="m-empty-sub">{description}</div>}
      {actionLabel && (
        <button className="m-btn" style={{ marginTop: 16, maxWidth: 200, marginLeft: "auto", marginRight: "auto" }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
