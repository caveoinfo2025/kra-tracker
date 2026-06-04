"use client";
import Link from "next/link";
import { fmtINR } from "../data";

/** ExpenseSummaryCard — a header KPI tile (money or count), `.kpi` styled. */
export default function ExpenseSummaryCard({
  label, value, money = true, icon: Icon, sub, tone = "default", accent, href,
}: {
  label: string;
  value: number | string;
  money?: boolean;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  sub?: string;
  tone?: "default" | "credit" | "debit" | "warn";
  accent?: boolean;
  href?: string;
}) {
  const color = tone === "credit" ? "var(--success)" : tone === "debit" ? "var(--caveo-red)" : tone === "warn" ? "var(--ot-orange)" : "var(--fg-1)";
  const display = typeof value === "number" && money ? fmtINR(value) : String(value);
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{label}</div>
        {Icon && <Icon size={15} strokeWidth={1.7} />}
      </div>
      <div className="kpi-value" style={{ fontSize: 22, color }}>{display}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{sub}</div>}
    </>
  );
  const cls = "kpi" + (accent ? " kpi-accent" : "") + (href ? " kpi-link" : "");
  return href ? <Link href={href} className={cls} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
