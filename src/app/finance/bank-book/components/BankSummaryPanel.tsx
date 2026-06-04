"use client";
import { useState } from "react";
import { BankAccount, BankTxn, fmtINR } from "../data";

type Period = "Current Month" | "Previous Month" | "YTD";
const PERIODS: Period[] = ["Current Month", "Previous Month", "YTD"];

/**
 * BankSummaryPanel — opening / credits / debits / closing for the selected
 * account across Current Month, Previous Month, and YTD.
 */
export default function BankSummaryPanel({
  account, txns,
}: {
  account: BankAccount;
  txns: BankTxn[];
}) {
  const [period, setPeriod] = useState<Period>("Current Month");

  // Mock period windows over the sample data (June 2026 = "current").
  const inPeriod = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    const m = d.getMonth(); // 0-based
    if (period === "Current Month") return m === 5;     // June
    if (period === "Previous Month") return m === 4;    // May
    return true;                                         // YTD
  };

  const rows = txns.filter((t) => t.accountId === account.id && inPeriod(t.date));
  const credits = rows.reduce((s, t) => s + t.credit, 0);
  const debits = rows.reduce((s, t) => s + t.debit, 0);
  // Opening for the period is illustrative: account opening for YTD/current, derived otherwise.
  const opening = account.openingBalance;
  const closing = opening + credits - debits;

  const cells: { label: string; value: number; tone?: "credit" | "debit" }[] = [
    { label: "Opening Balance", value: opening },
    { label: "Total Credits", value: credits, tone: "credit" },
    { label: "Total Debits", value: debits, tone: "debit" },
    { label: "Closing Balance", value: closing },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="ch-title">Account Summary</div>
        <div className="seg-control">
          {PERIODS.map((p) => (
            <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
              {p === "Current Month" ? "This Month" : p === "Previous Month" ? "Last Month" : "YTD"}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cells.map((c) => (
            <div key={c.label} style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 600 }}>
                {c.label}
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginTop: 4,
                color: c.tone === "credit" ? "var(--success)" : c.tone === "debit" ? "var(--caveo-red)" : "var(--fg-1)",
                fontVariantNumeric: "tabular-nums",
              }}>
                {fmtINR(c.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
