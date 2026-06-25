"use client";
import MIcon from "@/app/mobile/components/MIcon";

export type MobileNavTab = {
  key: string;
  label: string;
  icon: string;
};

interface MobileBottomNavProps {
  tabs: MobileNavTab[];
  active: string;
  onChange: (key: string) => void;
}

export default function MobileBottomNav({ tabs, active, onChange }: MobileBottomNavProps) {
  return (
    <div className="m-bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`m-tab${active === tab.key ? " active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          <MIcon name={tab.icon} size={18} />
          <span className="label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
