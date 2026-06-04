"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileSpreadsheet, FileText, CreditCard } from "lucide-react";
import { MonthlyStatement, TravelTrip, ConveyanceCaps, monthlyBadge, fmtINR, fmtKM } from "../data";

interface Props {
  statements: MonthlyStatement[];
  trips: TravelTrip[];
  caps: ConveyanceCaps;
  onProcess: (stmt: MonthlyStatement) => void;
  onExport: (kind: "excel" | "pdf") => void;
}

type SortKey = "employee" | "trips" | "totalKm" | "claimAmount" | "approvedAmount" | "paidAmount" | "status";

export default function MonthlyRegister({ statements, trips, caps, onProcess, onExport }: Props) {
  const [sort, setSort]     = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "employee", dir: 1 });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [monthFilter, setMonth] = useState("June 2026");

  const MONTHS = [...new Set(statements.map((s) => s.month))];

  function toggle(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 });
  }

  const filtered = statements.filter((s) => !monthFilter || s.month === monthFilter);

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort.key] as string | number;
    const bv = b[sort.key] as string | number;
    return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
  });

  // Totals row
  const totals = {
    trips:          sorted.reduce((s, m) => s + m.trips, 0),
    totalKm:        sorted.reduce((s, m) => s + m.totalKm, 0),
    claimAmount:    sorted.reduce((s, m) => s + m.claimAmount, 0),
    approvedAmount: sorted.reduce((s, m) => s + m.approvedAmount, 0),
    paidAmount:     sorted.reduce((s, m) => s + m.paidAmount, 0),
  };

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <ChevronDown size={10} style={{ opacity: 0.2 }} />;
    return sort.dir === 1 ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  function th(label: string, k: SortKey, right?: boolean) {
    return (
      <th onClick={() => toggle(k)} style={{ cursor: "pointer", userSelect: "none", textAlign: right ? "right" : "left" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{label}<SortIcon k={k} /></span>
      </th>
    );
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="ch-title">Monthly Conveyance Register</div>
          <select
            value={monthFilter}
            onChange={(e) => setMonth(e.target.value)}
            style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "var(--fg-2)", background: "var(--bg-elev)" }}
          >
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {caps.canExport && (
            <>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => onExport("excel")}><FileSpreadsheet size={13} /> Excel</button>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => onExport("pdf")}><FileText size={13} /> PDF</button>
            </>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th style={{ width: 32 }} />
              {th("Employee", "employee")}
              <th>Dept · Grade</th>
              {th("Trips", "trips", true)}
              {th("Total KM", "totalKm", true)}
              {th("Claim Amt", "claimAmount", true)}
              {th("Approved", "approvedAmount", true)}
              {th("Paid", "paidAmount", true)}
              {th("Status", "status")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((stmt) => {
              const empTrips = trips.filter((t) => t.employeeId === stmt.employeeId && t.month === stmt.month);
              const isOpen   = expanded === stmt.id;
              return (
                <>
                  <tr key={stmt.id} style={{ background: isOpen ? "var(--caveo-red-50)" : undefined }}>
                    <td>
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--fg-3)" }}
                        onClick={() => setExpanded(isOpen ? null : stmt.id)}
                      >
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{stmt.employee}</td>
                    <td style={{ fontSize: 12 }}>{stmt.department} · {stmt.grade}</td>
                    <td className="num">{stmt.trips}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{fmtKM(stmt.totalKm)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(stmt.claimAmount)}</td>
                    <td className="num" style={{ color: "var(--success)", fontWeight: 600 }}>{fmtINR(stmt.approvedAmount)}</td>
                    <td className="num" style={{ color: "var(--fg-3)" }}>{fmtINR(stmt.paidAmount)}</td>
                    <td><span className={`badge ${monthlyBadge(stmt.status)}`}>{stmt.status}</span></td>
                    <td>
                      {caps.canProcessPayment && ["Approved", "Payment Pending"].includes(stmt.status) && (
                        <button
                          className="btn-cav btn-cav-sm"
                          style={{ background: "var(--success)", color: "#fff", border: "none", fontSize: 11, padding: "3px 10px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4 }}
                          onClick={() => onProcess(stmt)}
                        >
                          <CreditCard size={11} /> Process
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded trip rows */}
                  {isOpen && empTrips.map((t) => (
                    <tr key={`sub-${t.id}`} style={{ background: "var(--bg-muted)", fontSize: 12 }}>
                      <td />
                      <td colSpan={2} style={{ paddingLeft: 24, color: "var(--fg-3)" }}>{t.date} · {t.purpose}</td>
                      <td />
                      <td className="num" style={{ color: "var(--fg-3)" }}>{t.vehicle !== "Public Transport" ? fmtKM(t.payableKm) : "—"}</td>
                      <td className="num" style={{ color: "var(--fg-2)", fontWeight: 500 }}>{fmtINR(t.claimAmount)}</td>
                      <td className="num" />
                      <td className="num" />
                      <td><span className={`badge ${t.status === "Paid" ? "badge-success" : "badge-neutral"}`} style={{ fontSize: 10 }}>{t.status}</span></td>
                      <td style={{ color: "var(--fg-4)", fontSize: 11 }}>{t.customer}</td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
          {/* Totals */}
          <tfoot>
            <tr style={{ background: "var(--bg-muted)", fontWeight: 700 }}>
              <td />
              <td colSpan={2} style={{ fontSize: 12, color: "var(--fg-3)" }}>TOTAL — {filtered.length} employees</td>
              <td className="num">{totals.trips}</td>
              <td className="num">{fmtKM(totals.totalKm)}</td>
              <td className="num">{fmtINR(totals.claimAmount)}</td>
              <td className="num" style={{ color: "var(--success)" }}>{fmtINR(totals.approvedAmount)}</td>
              <td className="num">{fmtINR(totals.paidAmount)}</td>
              <td /><td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
