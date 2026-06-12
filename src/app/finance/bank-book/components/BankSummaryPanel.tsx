"use client";
import { BankAccount, BankTxn, ApiSummary, fmtINR, fmtINRfromLakhs } from "../data";

/**
 * BankSummaryPanel — opening / credits / debits / closing for the selected account.
 *
 * When `apiSummary` is provided (live API mode), shows those values directly.
 * Without `apiSummary` (mock/legacy mode), falls back to computing from `txns`.
 */
export default function BankSummaryPanel({
  account, txns, apiSummary,
}: {
  account: BankAccount;
  txns: BankTxn[];
  apiSummary?: ApiSummary;
}) {
  let cells: { label: string; value: string; tone?: "credit" | "debit" }[];

  if (apiSummary) {
    cells = [
      { label: "Opening Balance", value: fmtINRfromLakhs(apiSummary.openingBalance) },
      { label: "Total Credits",   value: fmtINRfromLakhs(apiSummary.totalCredits),   tone: "credit" },
      { label: "Total Debits",    value: fmtINRfromLakhs(apiSummary.totalDebits),     tone: "debit"  },
      { label: "Closing Balance", value: fmtINRfromLakhs(apiSummary.closingBalance)  },
    ];
  } else {
    // Legacy: compute from mock txns for the selected account
    const accTxns = txns.filter((t) => t.accountId === account.id);
    const credits = accTxns.reduce((s, t) => s + t.credit, 0);
    const debits  = accTxns.reduce((s, t) => s + t.debit, 0);
    const opening = account.openingBalance;
    const closing = opening + credits - debits;
    cells = [
      { label: "Opening Balance", value: fmtINR(opening) },
      { label: "Total Credits",   value: fmtINR(credits), tone: "credit" },
      { label: "Total Debits",    value: fmtINR(debits),  tone: "debit"  },
      { label: "Closing Balance", value: fmtINR(closing) },
    ];
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="ch-title">Account Summary</div>
        {!apiSummary && (
          <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>All transactions</div>
        )}
        {apiSummary && (
          <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>For selected date range</div>
        )}
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
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
