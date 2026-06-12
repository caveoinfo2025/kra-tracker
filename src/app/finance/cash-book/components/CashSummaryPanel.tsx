"use client";
import { CashAccount, CashTxn, ApiCashSummary, fmtINR, fmtINRfromLakhs } from "../data";

/**
 * CashSummaryPanel — shows API summary when available, falls back to
 * computing from mock txns for backward compatibility.
 */
export default function CashSummaryPanel({
  account, txns, apiSummary,
}: {
  account: CashAccount;
  txns: CashTxn[];
  apiSummary?: ApiCashSummary;
}) {
  if (apiSummary) {
    const items = [
      { label: "Opening Balance", value: fmtINRfromLakhs(apiSummary.openingBalance) },
      { label: "Total Cash In",   value: fmtINRfromLakhs(apiSummary.totalCashIn),   tone: "credit" as const },
      { label: "Total Cash Out",  value: fmtINRfromLakhs(apiSummary.totalCashOut),  tone: "debit"  as const },
      { label: "Closing Balance", value: fmtINRfromLakhs(apiSummary.closingBalance), strong: true },
    ];
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="ch-title">Account Summary</div>
            <div className="ch-sub">{account.name} · For selected date range</div>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.label} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", marginBottom: 6 }}>{item.label}</div>
                <div style={{
                  fontSize: item.strong ? 15 : 14, fontWeight: item.strong ? 700 : 600,
                  fontVariantNumeric: "tabular-nums",
                  color: item.tone === "credit" ? "var(--success)" : item.tone === "debit" ? "var(--caveo-red)" : "var(--fg-1)",
                }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback: compute from mock txns
  const accTxns = txns.filter((t) => t.accountId === account.id);
  const monthOf = (iso: string) => new Date(iso + "T00:00:00").getMonth();

  function block(filter: (m: number) => boolean) {
    const rows = accTxns.filter((t) => filter(monthOf(t.date)));
    const cashIn = rows.reduce((s, t) => s + t.credit, 0);
    const cashOut = rows.reduce((s, t) => s + t.debit, 0);
    return { cashIn, cashOut, closing: account.openingBalance + cashIn - cashOut };
  }

  const periods = [
    { label: "Current Month", data: block((m) => m === 5) },
    { label: "Previous Month", data: block((m) => m === 4) },
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
