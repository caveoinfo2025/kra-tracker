"use client";

interface MobileSectionHeaderProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function MobileSectionHeader({ label, actionLabel, onAction }: MobileSectionHeaderProps) {
  return (
    <div className="m-section-label">
      <span>{label}</span>
      {actionLabel && (
        <span className="more" onClick={onAction}>
          {actionLabel}
        </span>
      )}
    </div>
  );
}
