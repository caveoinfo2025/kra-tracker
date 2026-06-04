"use client";
import { useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  BankAccount, ImportHistoryRow, IMPORT_HISTORY, todayISO, fmtDate,
  OPEN_COLLECTIONS, PAYABLE_EXPENSES,
} from "../data";
import BankStatementUpload from "./BankStatementUpload";
import BankImportPreviewTable, { PreviewRow, ImportAction } from "./BankImportPreviewTable";
import BankImportHistoryTable from "./BankImportHistoryTable";

/** Suggest a source link by amount (matching rule: amount, then ref/date/desc). */
function suggestSettlement(debit: number, credit: number): string | undefined {
  if (credit > 0) {
    const c = OPEN_COLLECTIONS.find((x) => x.amount === credit);
    if (c) return `${c.invoiceNo} · ${c.customer}`;
  }
  if (debit > 0) {
    const e = PAYABLE_EXPENSES.find((x) => x.amount === debit);
    if (e) return `${e.expenseNo} · ${e.vendor}`;
  }
  return undefined;
}

/** Deterministic mock preview rows synthesised from an uploaded file. */
function mockPreview(): PreviewRow[] {
  const base: Omit<PreviewRow, "action" | "settles">[] = [
    { id: 1, date: "2026-06-07", description: "NEFT IN — Wipro Ltd (INV-2190)", refNo: "NEFT-220114", debit: 0,      credit: 310000, balance: 2390000, match: "new" },
    { id: 2, date: "2026-06-07", description: "RTGS OUT — Ingram Micro",         refNo: "RTGS-660044", debit: 145000, credit: 0,      balance: 2245000, match: "new" },
    { id: 3, date: "2026-06-02", description: "Hardware procurement — Croma",    refNo: "RTGS-771902", debit: 128400, credit: 0,      balance: 2116600, match: "matched" },
    { id: 4, date: "2026-06-08", description: "UPI — pantry & supplies",         refNo: "UPI-660090",  debit: 3400,   credit: 0,      balance: 2113200, match: "new" },
    { id: 5, date: "2026-06-04", description: "Savings interest credit",         refNo: "INT-JUN26",   debit: 0,      credit: 3120,   balance: 2116320, match: "duplicate" },
    { id: 6, date: "2026-06-08", description: "Bank charges — NEFT",             refNo: "CHG-660001",  debit: 240,    credit: 0,      balance: 2116080, match: "new" },
  ];
  return base.map((r) => ({
    ...r,
    settles: suggestSettlement(r.debit, r.credit),
    action: r.match === "new" ? "add" : r.match === "matched" ? "update" : "ignore",
  }));
}

export default function BankImportWizard({
  accounts, defaultAccountId, currentUser, onClose, onComplete,
}: {
  accounts: BankAccount[];
  defaultAccountId: string;
  currentUser: string;
  onClose: () => void;
  onComplete: (row: ImportHistoryRow) => void;
}) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId === "all" ? accounts[0].id : defaultAccountId);
  const [periodFrom, setPeriodFrom] = useState("2026-06-01");
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [rows, setRows] = useState<PreviewRow[]>([]);

  function handleFile(name: string) {
    setFileName(name);
    setRows(mockPreview());
    setStep(2);
  }

  function setAction(id: number, action: ImportAction) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, action } : r)));
  }
  function bulk(filter: (r: PreviewRow) => boolean, action: ImportAction) {
    setRows((rs) => rs.map((r) => (filter(r) ? { ...r, action } : r)));
  }

  const summary = useMemo(() => {
    const added = rows.filter((r) => r.action === "add").length;
    const updated = rows.filter((r) => r.action === "update").length;
    const amended = rows.filter((r) => r.action === "amend").length;
    const ignored = rows.filter((r) => r.action === "ignore").length;
    return { total: rows.length, added, updated, amended, ignored, failed: 0 };
  }, [rows]);

  function process() {
    const row: ImportHistoryRow = {
      id: Math.max(0, ...IMPORT_HISTORY.map((h) => h.id)) + 1,
      fileName, importedBy: currentUser, importedAt: new Date().toISOString(),
      added: summary.added, updated: summary.updated, amended: summary.amended,
      status: summary.failed > 0 ? "Partial" : "Completed",
    };
    onComplete(row);
    setStep(4);
  }

  const account = accounts.find((a) => a.id === accountId);
  const stepLabels = ["Upload", "Account & Period", "Preview", "Summary"];

  return (
    <div className="detail-overlay" onClick={onClose} style={{ justifyContent: "center", alignItems: "flex-start", padding: "4vh 16px" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto",
          background: "var(--bg-elev)", borderRadius: 16, border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header + stepper */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--bg-elev)", zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>Import Bank Statement</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
              Step {step} of 4 · {stepLabels[step - 1]}
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm" aria-label="Close"><X size={16} /></button>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: 6, padding: "12px 20px 0" }}>
          {stepLabels.map((l, i) => (
            <div key={l} style={{ flex: 1, height: 4, borderRadius: 999, background: i < step ? "var(--caveo-red)" : "var(--bg-muted)", transition: "background .2s" }} />
          ))}
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          {/* Step 1 — Upload + history */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <BankStatementUpload onFile={handleFile} />
              <div>
                <div className="section-label">Import History</div>
                <BankImportHistoryTable rows={IMPORT_HISTORY} />
              </div>
            </div>
          )}

          {/* Step 2 — Account + period */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "var(--fg-2)" }}>
                Uploaded: <b>{fileName || "statement.csv"}</b>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Destination Bank Account</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Statement From</label>
                  <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Statement To</label>
                  <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-4)" }}>
                {rows.length} rows parsed from the statement for <b>{account?.name}</b>.
              </div>
            </div>
          )}

          {/* Step 3 — Preview + bulk actions */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => bulk((r) => r.match === "new", "add")}>Add All New</button>
                <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => bulk((r) => r.match === "matched", "update")}>Update All Matches</button>
                <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => bulk((r) => r.match === "duplicate", "amend")}>Amend Duplicates</button>
                <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => bulk((r) => r.match === "duplicate", "ignore")}>Ignore Duplicates</button>
              </div>
              <BankImportPreviewTable rows={rows} onAction={setAction} />
              <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                Matching rules: reference number, transaction date, amount, and description. Possible duplicates are flagged for review.
              </div>
            </div>
          )}

          {/* Step 4 — Summary */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(31,157,85,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <CheckCircle2 size={32} color="var(--success)" />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Import complete</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>
                {fileName} · {account?.name} · imported by {currentUser}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ marginTop: 18, textAlign: "left" }}>
                {[
                  { l: "Total Records", v: summary.total },
                  { l: "New Added", v: summary.added, c: "var(--success)" },
                  { l: "Updated", v: summary.updated },
                  { l: "Amended", v: summary.amended },
                  { l: "Ignored", v: summary.ignored, c: "var(--fg-3)" },
                  { l: "Failed", v: summary.failed, c: summary.failed ? "var(--caveo-red)" : "var(--fg-3)" },
                ].map((s) => (
                  <div key={s.l} style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 600 }}>{s.l}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: s.c ?? "var(--fg-1)", marginTop: 2 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 10, position: "sticky", bottom: 0, background: "var(--bg-elev)" }}>
          {step > 1 && step < 4 ? (
            <button className="btn-cav btn-cav-secondary" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>
          ) : <span />}
          {step === 1 && <span style={{ fontSize: 12, color: "var(--fg-4)", alignSelf: "center" }}>Upload a file to continue</span>}
          {step === 2 && <button className="btn-cav btn-cav-primary" onClick={() => setStep(3)}>Preview Data <ChevronRight size={14} /></button>}
          {step === 3 && <button className="btn-cav btn-cav-primary" onClick={process}>Process Import <ChevronRight size={14} /></button>}
          {step === 4 && <button className="btn-cav btn-cav-primary" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
