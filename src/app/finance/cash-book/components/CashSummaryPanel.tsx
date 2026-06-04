"use client";
import { CashAccount, CashTxn, fmtINR } from "../data";

/**
 * CashSummaryPanel — opening balance + Current Month / Previous Month / YTD,
 * each with Total Cash In, Total Cash Out, and Closing Balance.
 */
export default function CashSummaryPanel({ account, txns }: { account: CashAccount; txns: CashTxn[] }) {
  const accTxns = txns.filter((t) => t.accountId === account.id);
  const monthOf = (iso: string) => new Date(iso + "T00:00:00").getMonth(); // 0-based

  function block(filter: (m: number) => boolean) {
    const rows = accTxns.filter((t) => filter(monthOf(t.date)));
    const cashIn = rows.reduce((s, t) => s + t.credit, 0);
    const cashOut = rows.reduce((s, t) => s + t.debit, 0);
    return { cashIn, cashOut, closing: account.openingBalance + cashIn - cashOut };
  }

  const periods = [
    { label: "Current Month", data: block((m) => m === 5) },   // June
    { label: "Previous Month", data: block((m) => m === 4) },  // May
    { label: "Year To Date", data: block(() => true) },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="ch-title">Account Summary</div>
          <div className="ch-sub">{account.name} · Opening {fmtINR(account.openingBalance)}</div>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {periods.map((p) => (
            <div key={p.label} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: "var(--bg-muted)", padding: "8px 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>
                {p.label}
              </div>
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <Line label="Total Cash In" value={p.data.cashIn} tone="credit" />
                <Line label="Total Cash Out" value={p.data.cashOut} tone="debit" />
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                  <Line label="Closing Balance" value={p.data.closing} strong />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, tone, strong }: { label: string; value: number; tone?: "credit" | "debit"; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{label}</span>
      <span style={{
        fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 600, fontVariantNumeric: "tabular-nums",
        color: tone === "credit" ? "var(--success)" : tone === "debit" ? "var(--caveo-red)" : "var(--fg-1)",
      }}>{fmtINR(value)}</span>
    </div>
  );
}
