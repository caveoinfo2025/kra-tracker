"use client";
import { fmtINRorDash, fmtDate } from "../data";

export type ImportAction = "add" | "update" | "amend" | "ignore";

export interface PreviewRow {
  id: number;
  date: string;
  description: string;
  refNo: string;
  debit: number;
  credit: number;
  balance: number;
  match: "new" | "matched" | "duplicate"; // matching outcome
  action: ImportAction;
  settles?: string;   // suggested source link (Collection / Advance / Expense)
}

const ACTION_LABEL: Record<ImportAction, string> = {
  add: "Add New", update: "Update", amend: "Amend", ignore: "Ignore",
};

const MATCH_BADGE: Record<PreviewRow["match"], string> = {
  new: "badge-info", matched: "badge-success", duplicate: "badge-warning",
};
const MATCH_LABEL: Record<PreviewRow["match"], string> = {
  new: "New", matched: "Matched", duplicate: "Possible duplicate",
};

/**
 * BankImportPreviewTable — step 3. Shows parsed rows with a per-row action
 * selector and the match outcome (matching rules: ref no, date, amount, desc).
 */
export default function BankImportPreviewTable({
  rows, onAction,
}: {
  rows: PreviewRow[];
  onAction: (id: number, action: ImportAction) => void;
}) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
      <table className="crm-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Reference</th>
            <th className="th-right">Debit</th>
            <th className="th-right">Credit</th>
            <th className="th-right">Balance</th>
            <th>Match</th>
            <th>Settles</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={r.action === "ignore" ? { opacity: 0.5 } : undefined}>
              <td className="cell-strong" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
              <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)" }}>{r.refNo}</td>
              <td className="td-right" style={{ color: r.debit ? "var(--caveo-red)" : "var(--fg-4)" }}>{fmtINRorDash(r.debit)}</td>
              <td className="td-right" style={{ color: r.credit ? "var(--success)" : "var(--fg-4)" }}>{fmtINRorDash(r.credit)}</td>
              <td className="td-right cell-strong">{fmtINRorDash(r.balance)}</td>
              <td><span className={`badge ${MATCH_BADGE[r.match]}`}>{MATCH_LABEL[r.match]}</span></td>
              <td style={{ fontSize: 11.5, color: r.settles ? "var(--caveo-red)" : "var(--fg-4)" }}>
                {r.settles ?? "—"}
              </td>
              <td>
                <select
                  value={r.action}
                  onChange={(e) => onAction(r.id, e.target.value as ImportAction)}
                  className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  style={{ background: "var(--bg-elev)" }}
                >
                  {(Object.keys(ACTION_LABEL) as ImportAction[])
                    // "update"/"amend" only make sense for matched/duplicate rows
                    .filter((a) => (r.match === "new" ? a === "add" || a === "ignore" : true))
                    .map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
