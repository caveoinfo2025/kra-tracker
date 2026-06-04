"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, MapPin, Bike, Car, Bus } from "lucide-react";
import { TravelTrip, ConveyanceCaps, tripBadge, fmtINR, fmtDate, fmtKM } from "../data";

interface Props {
  rows: TravelTrip[];
  caps: ConveyanceCaps;
  onRowClick: (t: TravelTrip) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
}

type SortKey = "date" | "employee" | "customer" | "payableKm" | "claimAmount" | "status";

export default function TravelClaimTable({ rows, caps, onRowClick, onApprove, onReject }: Props) {
  const [sort, setSort]   = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [page, setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const PAGE = 15;

  function toggle(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 });
    setPage(1);
  }

  const filtered = rows.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.customer.toLowerCase().includes(q) ||
      t.employee.toLowerCase().includes(q) ||
      t.purpose.toLowerCase().includes(q) ||
      t.tripNo.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const { key, dir } = sort;
    const av = a[key] as string | number;
    const bv = b[key] as string | number;
    return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
  });

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const slice = sorted.slice((page - 1) * PAGE, page * PAGE);

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <ChevronDown size={11} style={{ opacity: 0.25 }} />;
    return sort.dir === 1 ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  function th(label: string, k: SortKey) {
    return (
      <th onClick={() => toggle(k)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{label}<SortIcon k={k} /></span>
      </th>
    );
  }

  const VehicleIcon = (v: string) =>
    v === "Bike" ? <Bike size={13} strokeWidth={1.7} /> :
    v === "Car"  ? <Car  size={13} strokeWidth={1.7} /> :
    <Bus size={13} strokeWidth={1.7} />;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Search + count */}
      <div className="card-header">
        <div className="ch-title">
          Travel Trips
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "var(--fg-4)" }}>
            {filtered.length} {filtered.length === 1 ? "trip" : "trips"}
          </span>
        </div>
        <input
          type="text"
          placeholder="Search trips…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px",
            fontSize: 12.5, outline: "none", width: 180, background: "var(--bg-elev)",
            color: "var(--fg-1)",
          }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              {th("Date", "date")}
              <th>Trip No</th>
              {caps.scope !== "own" && th("Employee", "employee")}
              {th("Customer", "customer")}
              <th>Purpose</th>
              <th>Vehicle</th>
              {th("Payable KM", "payableKm")}
              {th("Claim", "claimAmount")}
              {th("Status", "status")}
              {(caps.canApprove) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {slice.map((t) => (
              <tr key={t.id} onClick={() => onRowClick(t)} style={{ cursor: "pointer" }}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                <td style={{ fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{t.tripNo}</td>
                {caps.scope !== "own" && <td style={{ fontWeight: 500 }}>{t.employee}</td>}
                <td>
                  <div style={{ fontWeight: 500 }}>{t.customer}</div>
                  {t.customerSite && <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{t.customerSite}</div>}
                </td>
                <td style={{ fontSize: 12.5 }}>{t.purpose}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5 }}>
                    {VehicleIcon(t.vehicle)} {t.vehicle}
                  </span>
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {t.vehicle === "Public Transport" ? "—" : fmtKM(t.payableKm)}
                </td>
                <td className="num" style={{ fontWeight: 700 }}>{fmtINR(t.claimAmount)}</td>
                <td>
                  <span className={`badge ${tripBadge(t.status)}`}>{t.status}</span>
                </td>
                {caps.canApprove && (
                  <td onClick={(e) => e.stopPropagation()}>
                    {t.status === "Submitted" && (
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          className="btn-cav btn-cav-sm"
                          style={{ background: "var(--success)", color: "#fff", border: "none", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}
                          onClick={() => onApprove?.(t.id)}
                        >✓ Approve</button>
                        <button
                          className="btn-cav btn-cav-sm"
                          style={{ background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", border: "1px solid rgba(200,16,46,0.2)", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}
                          onClick={() => onReject?.(t.id)}
                        >✗ Reject</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-4)" }}>
                  <MapPin size={28} strokeWidth={1.2} style={{ display: "block", margin: "0 auto 8px", opacity: 0.5 }} />
                  No trips found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Page {page} / {pages}</span>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>›</button>
        </div>
      )}
    </div>
  );
}
