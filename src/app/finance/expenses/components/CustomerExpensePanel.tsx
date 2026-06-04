"use client";
import { TrendingUp } from "lucide-react";
import { CUSTOMER_REVENUE, fmtINR } from "../data";

/**
 * CustomerExpensePanel — customer cost-impact preview feeding profitability.
 * Shows project revenue, existing expenses, this expense, and updated cost.
 */
export default function CustomerExpensePanel({
  customer, existingExpenses, thisExpense,
}: {
  customer: string;
  existingExpenses: number;
  thisExpense: number;
}) {
  if (!customer) return null;
  const revenue = CUSTOMER_REVENUE[customer] ?? 0;
  const updated = existingExpenses + thisExpense;
  const margin = revenue > 0 ? ((revenue - updated) / revenue) * 100 : 0;

  const Row = ({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{k}</span>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 600, color: tone ?? "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", background: "var(--surface-alt)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <TrendingUp size={15} style={{ color: "var(--caveo-red)" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Customer Cost Impact — {customer}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Row k="Project Revenue" v={fmtINR(revenue)} />
        <Row k="Existing Expenses" v={fmtINR(existingExpenses)} />
        <Row k="This Expense" v={`+ ${fmtINR(thisExpense)}`} tone="var(--caveo-red)" />
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
          <Row k="Updated Cost" v={fmtINR(updated)} strong />
        </div>
        {revenue > 0 && <Row k="Est. Margin" v={`${margin.toFixed(1)}%`} tone={margin >= 0 ? "var(--success)" : "var(--caveo-red)"} />}
      </div>
    </div>
  );
}
