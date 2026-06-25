"use client";
import type { ReactNode } from "react";
import MIcon from "@/app/mobile/components/MIcon";

interface MobileKpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; direction: "up" | "down" };
  accent?: "left" | "top" | "none";
  icon?: string;
  /** Font size in px for the value. Defaults to 24 (numeric KPI emphasis); pass ~15 for textual values (names, dates). */
  valueSize?: number;
  children?: ReactNode;
}

export default function MobileKpiCard({ label, value, unit, delta, accent = "none", icon, valueSize, children }: MobileKpiCardProps) {
  const accentClass = accent === "left" ? " m-kpi-accent" : accent === "top" ? " top-accent" : "";
  return (
    <div className={`m-kpi${accentClass}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="m-kpi-label">{label}</span>
        {icon && <MIcon name={icon} size={14} color="var(--fg-3)" />}
      </div>
      <div className="m-kpi-value" style={valueSize ? { fontSize: valueSize } : undefined}>
        {value}
        {unit && <span className="unit">&nbsp;{unit}</span>}
      </div>
      {delta && (
        <span className={`m-kpi-delta ${delta.direction}`}>
          <MIcon name={delta.direction === "up" ? "trend-up" : "trend-up"} size={11} />
          {delta.value}
        </span>
      )}
      {children}
    </div>
  );
}
