"use client";
import { Customer, allGSTINs, gstStatusBadge, GST_STATE_CODES } from "../data";
import { GSTINBadge } from "../../vendors/components/GSTRegistrationPanel";

/**
 * CustomerGSTPanel — read-only summary of every GST registration across the
 * customer's sites (one customer → many sites → many GSTINs / states).
 * Reuses the Vendor Master GSTINBadge for visual consistency.
 */
export default function CustomerGSTPanel({ customer }: { customer: Customer }) {
  const gstins = allGSTINs(customer);
  if (gstins.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-4)", fontSize: 13 }}>No GST registrations. Enable GST on a site to add one.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
        {gstins.length} GST registration{gstins.length !== 1 ? "s" : ""} across {customer.sites.length} site{customer.sites.length !== 1 ? "s" : ""} — used for billing, e-invoicing, and multi-state GST reporting.
      </div>
      {gstins.map((s) => (
        <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--surface-alt)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.siteName}</span>
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>{s.state} · {s.stateCode}</span>
            <span className={`badge ${gstStatusBadge(s.gstStatus)}`} style={{ fontSize: 10 }}>{s.gstStatus}</span>
          </div>
          <GSTINBadge gstin={s.gstin} status={s.gstStatus} stateName={GST_STATE_CODES[s.stateCode] ?? s.state} />
          <div className="kv-grid" style={{ marginTop: 12 }}>
            <div className="kv-key">GST Legal Name</div><div className="kv-val">{s.gstLegalName || "—"}</div>
            <div className="kv-key">Output GST Ledger</div><div className="kv-val">{s.gstLedgerMapping || "—"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
