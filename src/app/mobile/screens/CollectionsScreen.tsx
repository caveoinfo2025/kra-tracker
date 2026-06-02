"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";

type CollectionRow = {
  id: number;
  invoiceDate: string;
  invoiceNo: string;
  customerName: string;
  invoiceValueLakhs: number;
  amountWithoutGstLakhs: number;
  amountReceivedLakhs: number;
  dueDate: string;
  paymentReceivedDate: string | null;
  collectionStatus: string;
  remarks: string;
  employee?: { name: string };
};

interface Props {
  isManager: boolean;
  onBack: () => void;
}

type Seg = "open" | "overdue" | "all";

const STATUS_PILL: Record<string, string> = {
  "Pending": "lead",
  "Partially Received": "prop",
  "Fully Received": "won",
};

function isOverdue(row: CollectionRow): boolean {
  if (row.collectionStatus === "Fully Received") return false;
  return new Date(row.dueDate) < new Date();
}

function fmtLakhs(val: number) {
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${Math.abs(val).toFixed(0)} L`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function CollectionsScreen({ isManager, onBack }: Props) {
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState<Seg>("open");

  useEffect(() => {
    fetch("/api/collections")
      .then(r => r.json())
      .then(data => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalBilled = rows.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const totalCollected = rows.reduce((s, r) => s + r.amountReceivedLakhs, 0);
  const totalOutstanding = totalBilled - totalCollected;
  const overdueRows = rows.filter(r => isOverdue(r));
  const openRows = rows.filter(r => r.collectionStatus !== "Fully Received");

  const filtered = rows.filter(r => {
    if (seg === "open") return r.collectionStatus !== "Fully Received";
    if (seg === "overdue") return isOverdue(r);
    return true;
  }).sort((a, b) => {
    // Overdue first, then by due date ascending
    const aOD = isOverdue(a) ? 0 : 1;
    const bOD = isOverdue(b) ? 0 : 1;
    if (aOD !== bOD) return aOD - bOD;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Back
          </button>
          <div className="m-nav-title">Collections</div>
          <div style={{ width: 36 }} />
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">Billing & Payments</div>
          <h1 className="m-title">Collections</h1>
          <div className="m-subtitle">
            {rows.length} invoice{rows.length !== 1 ? "s" : ""} ·{" "}
            {overdueRows.length > 0
              ? <span style={{ color: "var(--caveo-red)" }}>{overdueRows.length} overdue</span>
              : "None overdue"}
          </div>
        </div>

        {/* KPI row */}
        <div className="m-section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div className="m-kpi">
              <div className="m-kpi-label">Billed</div>
              <div className="m-kpi-value" style={{ fontSize: 18 }}>
                {totalBilled >= 100
                  ? <>{(totalBilled / 100).toFixed(1)}<span className="unit">Cr</span></>
                  : <>{totalBilled.toFixed(0)}<span className="unit">L</span></>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>{rows.length} invoices</div>
            </div>
            <div className="m-kpi">
              <div className="m-kpi-label">Collected</div>
              <div className="m-kpi-value" style={{ fontSize: 18, color: "var(--success)" }}>
                {totalCollected >= 100
                  ? <>{(totalCollected / 100).toFixed(1)}<span className="unit">Cr</span></>
                  : <>{totalCollected.toFixed(0)}<span className="unit">L</span></>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>received</div>
            </div>
            <div className="m-kpi" style={overdueRows.length > 0 ? { borderLeft: "3px solid var(--caveo-red)" } : {}}>
              <div className="m-kpi-label">Outstanding</div>
              <div className="m-kpi-value" style={{ fontSize: 18, color: overdueRows.length > 0 ? "var(--caveo-red)" : "var(--fg-1)" }}>
                {totalOutstanding >= 100
                  ? <>{(totalOutstanding / 100).toFixed(1)}<span className="unit">Cr</span></>
                  : <>{Math.max(0, totalOutstanding).toFixed(0)}<span className="unit">L</span></>}
              </div>
              <div style={{ fontSize: 10.5, color: overdueRows.length > 0 ? "var(--caveo-red)" : "var(--fg-4)", marginTop: 2 }}>
                {openRows.length} open
              </div>
            </div>
          </div>
        </div>

        {/* Overdue alert */}
        {overdueRows.length > 0 && (
          <div className="m-section">
            <div className="m-card" style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "rgba(200,16,46,0.05)",
              border: "1px solid rgba(200,16,46,0.2)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(200,16,46,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <MIcon name="alert" size={17} color="var(--caveo-red)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--caveo-red)" }}>
                  {overdueRows.length} overdue invoice{overdueRows.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>
                  {fmtLakhs(overdueRows.reduce((s, r) => s + (r.invoiceValueLakhs - r.amountReceivedLakhs), 0))} pending collection
                </div>
              </div>
              <button
                onClick={() => setSeg("overdue")}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--caveo-red)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: "4px 0" }}
              >
                View →
              </button>
            </div>
          </div>
        )}

        {/* Segment */}
        <div style={{ padding: "0 18px 14px" }}>
          <div className="m-seg">
            <button className={seg === "open" ? "active" : ""} onClick={() => setSeg("open")}>
              Open {openRows.length > 0 ? `(${openRows.length})` : ""}
            </button>
            <button className={seg === "overdue" ? "active" : ""} onClick={() => setSeg("overdue")}>
              Overdue {overdueRows.length > 0 ? `(${overdueRows.length})` : ""}
            </button>
            <button className={seg === "all" ? "active" : ""} onClick={() => setSeg("all")}>All</button>
          </div>
        </div>

        {/* Invoice list */}
        <div className="m-section">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "65%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 11, width: "45%" }} />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-title">
                {seg === "overdue" ? "No overdue invoices" : seg === "open" ? "All invoices collected" : "No invoices"}
              </div>
              <div className="m-empty-sub">
                {seg === "overdue" ? "All collections are on track." : "Nothing to show in this view."}
              </div>
            </div>
          ) : (
            <div className="m-list">
              {filtered.map(row => {
                const overdue = isOverdue(row);
                const outstanding = row.invoiceValueLakhs - row.amountReceivedLakhs;
                const statusLabel = overdue ? "Overdue" : row.collectionStatus;
                const pillClass = overdue ? "neg" : (STATUS_PILL[row.collectionStatus] ?? "lead");
                const pctCollected = row.invoiceValueLakhs > 0 ? (row.amountReceivedLakhs / row.invoiceValueLakhs) * 100 : 0;

                return (
                  <div key={row.id} className="m-list-row" style={{ alignItems: "flex-start", padding: "13px 14px" }}>
                    <div className="row-main">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div className="row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {row.customerName}
                        </div>
                        <div style={{
                          fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
                          color: overdue ? "var(--caveo-red)" : "var(--fg-1)",
                          flexShrink: 0,
                        }}>
                          {fmtLakhs(row.invoiceValueLakhs)}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                          {row.invoiceNo || "—"}
                        </span>
                        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>·</span>
                        <span style={{ fontSize: 11.5, color: overdue ? "var(--caveo-red)" : "var(--fg-3)" }}>
                          Due {fmtDate(row.dueDate)}
                        </span>
                        {isManager && row.employee && (
                          <>
                            <span style={{ color: "var(--fg-4)", fontSize: 11 }}>·</span>
                            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{row.employee.name.split(" ")[0]}</span>
                          </>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
                        <span className={`m-pill ${pillClass}`}>{statusLabel}</span>
                        {outstanding > 0.01 && (
                          <span style={{ fontSize: 11, color: overdue ? "var(--caveo-red)" : "var(--fg-3)", fontWeight: 600 }}>
                            -{fmtLakhs(outstanding)} pending
                          </span>
                        )}
                      </div>

                      {/* Mini progress bar for partially received */}
                      {row.collectionStatus === "Partially Received" && (
                        <div className="m-progress" style={{ marginTop: 7 }}>
                          <span style={{ width: `${Math.min(100, pctCollected)}%`, background: "var(--ot-orange)" }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
