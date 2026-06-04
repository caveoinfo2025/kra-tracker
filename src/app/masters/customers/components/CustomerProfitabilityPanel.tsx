"use client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { CustomerProfitability, fmtINR, grossMargin, marginPct } from "../data";

function CostBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <div style={{ width: 130, fontSize: 12, color: "var(--fg-2)" }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: "var(--bg-muted)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${max ? (value / max) * 100 : 0}%`, background: color, borderRadius: 5 }} />
      </div>
      <div style={{ width: 96, fontSize: 12, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(value)}</div>
    </div>
  );
}

export default function CustomerProfitabilityPanel({ profitability }: { profitability: CustomerProfitability }) {
  const p = profitability;
  const margin = grossMargin(p);
  const pct = marginPct(p);
  const totalCost = p.productCost + p.serviceCost + p.engineerTravel + p.customerExpenses;
  const maxBar = Math.max(p.revenue, totalCost, 1);
  const positive = margin >= 0;

  if (p.revenue === 0 && totalCost === 0) {
    return <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-4)", fontSize: 13 }}>No revenue or cost recorded yet — profitability appears once transactions are linked.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Headline KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value" style={{ fontSize: 20 }}>{fmtINR(p.revenue)}</div></div>
        <div className="kpi"><div className="kpi-label">Total Cost</div><div className="kpi-value" style={{ fontSize: 20, color: "var(--caveo-red)" }}>{fmtINR(totalCost)}</div></div>
        <div className="kpi kpi-accent">
          <div className="kpi-label">Gross Margin</div>
          <div className="kpi-value" style={{ fontSize: 20, color: positive ? "var(--success)" : "var(--caveo-red)", display: "flex", alignItems: "center", gap: 6 }}>
            {positive ? <TrendingUp size={17} /> : <TrendingDown size={17} />}{fmtINR(margin)}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{pct}% of revenue</div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div>
        <div className="section-label">Revenue vs Cost Breakdown</div>
        <CostBar label="Revenue" value={p.revenue} max={maxBar} color="var(--success)" />
        <CostBar label="Product Cost" value={p.productCost} max={maxBar} color="var(--caveo-red)" />
        <CostBar label="Service Cost" value={p.serviceCost} max={maxBar} color="#FF6B00" />
        <CostBar label="Engineer Travel" value={p.engineerTravel} max={maxBar} color="#0066FF" />
        <CostBar label="Customer Expenses" value={p.customerExpenses} max={maxBar} color="#9333EA" />
      </div>

      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>Net Gross Margin</span>
        <span style={{ fontWeight: 700, color: positive ? "var(--success)" : "var(--caveo-red)" }}>{fmtINR(margin)} ({pct}%)</span>
      </div>

      <div style={{ fontSize: 11, color: "var(--fg-4)" }}>
        Profitability aggregates linked Orders (revenue), product/service cost, engineer travel (conveyance), and customer expenses. Illustrative figures.
      </div>
    </div>
  );
}
