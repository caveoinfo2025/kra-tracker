"use client";
import MIcon from "@/app/mobile/components/MIcon";

interface MobileQuickActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

export default function MobileQuickActionButton({ icon, label, onClick }: MobileQuickActionButtonProps) {
  return (
    <button className="m-quick-action" onClick={onClick}>
      <span className="ico">
        <MIcon name={icon} size={16} />
      </span>
      <span className="lbl">{label}</span>
    </button>
  );
}
