"use client";
import { fmtINR } from "../data";

/**
 * BankBalanceCard — a single KPI tile in the Bank Book header strip.
 * Reuses the `.kpi` design-system classes.
 */
export default function BankBalanceCard({
  label, value, tone = "default", sub, accent,
}: {
  label: string;
  value: number;
  tone?: "default" | "credit" | "debit";
  sub?: string;
  accent?: boolean;
}) {
  const color =
    tone === "credit" ? "var(--success)" : tone === "debit" ? "var(--caveo-red)" : "var(--fg-1)";
  return (
    <div className={"kpi" + (accent ? " kpi-accent" : "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 22, color }}>{fmtINR(value)}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
