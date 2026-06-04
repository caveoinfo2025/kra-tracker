"use client";
import { useState } from "react";
import { X, Pencil, Ban, Copy } from "lucide-react";
import {
  Vendor, VendorCaps, VendorBranch, VendorContact, VendorBankAccount,
  allGSTINs, primaryBranch, primaryContact, statusBadge, gstStatusBadge,
  fmtDate, todayISO, GST_STATE_CODES,
} from "../data";
import VendorBranchManager from "./VendorBranchManager";
import VendorContactManager from "./VendorContactManager";
import VendorBankManager from "./VendorBankManager";
import VendorDocumentPanel from "./VendorDocumentPanel";
import VendorUsageViewer from "./VendorUsageViewer";
import { GSTINBadge } from "./GSTRegistrationPanel";

type Tab = "Overview" | "Branches" | "GST" | "Contacts" | "Bank" | "Documents" | "Transactions" | "Purchase History" | "Audit";
const TABS: Tab[] = ["Overview", "Branches", "GST", "Contacts", "Bank", "Documents", "Transactions", "Purchase History", "Audit"];

export default function VendorProfile({
  vendor, caps, onClose, onEdit, onDisable, onChange,
}: {
  vendor: Vendor;
  caps: VendorCaps;
  onClose: () => void;
  onEdit: (v: Vendor) => void;
  onDisable: (ids: number[]) => void;
  onChange: (v: Vendor) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const pb = primaryBranch(vendor);
  const pc = primaryContact(vendor);
  const gstins = allGSTINs(vendor);

  const Row = ({ k, v }: { k: string; v?: string | React.ReactNode }) =>
    v ? <><div className="kv-key">{k}</div><div className="kv-val">{v}</div></> : null;
  const YN = (v: boolean) => v ? <span className="badge badge-success" style={{ fontSize: 10 }}>Yes</span> : <span className="badge badge-neutral" style={{ fontSize: 10 }}>No</span>;

  // Mutations within profile tabs
  function updateBranches(branches: VendorBranch[]) {
    onChange({ ...vendor, branches, modifiedBy: "You", modifiedAt: todayISO() });
  }
  function updateContacts(contacts: VendorContact[]) {
    onChange({ ...vendor, contacts, modifiedBy: "You", modifiedAt: todayISO() });
  }
  function updateBanks(bankAccounts: VendorBankAccount[]) {
    onChange({ ...vendor, bankAccounts, modifiedBy: "You", modifiedAt: todayISO() });
  }

  const tabContent: Record<Tab, React.ReactNode> = {
    Overview: (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Key info */}
        <div>
          <div className="section-label">Basic Information</div>
          <div className="kv-grid">
            <Row k="Vendor Code" v={<span style={{ fontFamily: "var(--font-mono)", color: "var(--caveo-red)" }}>{vendor.vendorCode}</span>} />
            <Row k="Legal Name" v={vendor.legalName} />
            {vendor.tradeName !== vendor.legalName && <Row k="Trade Name" v={vendor.tradeName} />}
            <Row k="Type" v={<span className="badge badge-neutral" style={{ fontSize: 10 }}>{vendor.vendorType}</span>} />
            <Row k="Category" v={vendor.businessCategory} />
            <Row k="Company Type" v={vendor.companyType} />
            <Row k="Status" v={<span className={`badge ${statusBadge(vendor.status)}`}>{vendor.status}</span>} />
          </div>
        </div>
        <div>
          <div className="section-label">Registration</div>
          <div className="kv-grid">
            <Row k="PAN" v={<span style={{ fontFamily: "var(--font-mono)" }}>{vendor.pan}</span>} />
            <Row k="MSME" v={YN(vendor.msmeRegistered)} />
            {vendor.msmeRegistered && <Row k="Udyam No." v={vendor.msmeNumber} />}
          </div>
        </div>
        {pb && (
          <div>
            <div className="section-label">Primary Branch</div>
            <div className="kv-grid">
              <Row k="Branch" v={pb.branchName} />
              <Row k="City" v={pb.city} />
              <Row k="State" v={`${pb.state} (${pb.stateCode})`} />
              <Row k="PIN" v={pb.pinCode} />
              <Row k="Contact" v={pb.contactPerson} />
              <Row k="Phone" v={pb.phone} />
            </div>
          </div>
        )}
        {pc && (
          <div>
            <div className="section-label">Primary Contact</div>
            <div className="kv-grid">
              <Row k="Name" v={pc.name} />
              <Row k="Designation" v={pc.designation || undefined} />
              <Row k="Mobile" v={pc.mobile} />
              <Row k="Email" v={pc.email || undefined} />
              <Row k="Type" v={pc.contactType} />
            </div>
          </div>
        )}
        {gstins.length > 0 && (
          <div>
            <div className="section-label">GST Registrations ({gstins.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {gstins.map((b) => (
                <GSTINBadge key={b.id} gstin={b.gstin} status={b.gstStatus} stateName={`${b.branchName} · ${b.state}`} />
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="section-label">Tally Integration</div>
          <div className="kv-grid">
            <Row k="Tally Ledger" v={vendor.tallyLedger || "—"} />
            <Row k="Created By" v={vendor.createdBy} />
            <Row k="Created On" v={fmtDate(vendor.createdAt)} />
            {vendor.modifiedBy && <Row k="Last Modified" v={`${vendor.modifiedBy} on ${fmtDate(vendor.modifiedAt ?? "")}`} />}
          </div>
        </div>
      </div>
    ),

    Branches: <VendorBranchManager branches={vendor.branches} caps={caps} onChange={updateBranches} />,

    GST: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {gstins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-4)", fontSize: 13 }}>No GST registrations found. Add a branch with GST enabled.</div>
        ) : gstins.map((b) => (
          <div key={b.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--surface-alt)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{b.branchName}</span>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>{b.state}</span>
              <span className={`badge ${gstStatusBadge(b.gstStatus)}`} style={{ fontSize: 10 }}>{b.gstStatus}</span>
            </div>
            <div className="kv-grid">
              <Row k="GSTIN" v={<span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--caveo-red)", letterSpacing: 0.5 }}>{b.gstin}</span>} />
              <Row k="GST Legal Name" v={b.gstLegalName || "—"} />
              <Row k="State" v={`${b.state} · Code ${b.stateCode}`} />
              <Row k="GST Ledger (Tally)" v={b.gstLedgerMapping || "—"} />
            </div>
          </div>
        ))}
      </div>
    ),

    Contacts: <VendorContactManager contacts={vendor.contacts} caps={caps} onChange={updateContacts} />,
    Bank: <VendorBankManager bankAccounts={vendor.bankAccounts} branches={vendor.branches} caps={caps} onChange={updateBanks} />,
    Documents: <VendorDocumentPanel documents={vendor.documents} caps={caps} onAdd={() => alert("Upload — coming soon")} />,
    Transactions: <VendorUsageViewer vendor={vendor} caps={caps} />,
    "Purchase History": (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--fg-4)" }}>
        <div style={{ fontSize: 13 }}>Purchase order history will appear here once the Procurement module is live.</div>
        <span className="badge badge-neutral" style={{ marginTop: 12, display: "inline-block", fontSize: 11 }}>Procurement module — coming soon</span>
      </div>
    ),
    Audit: (
      <div className="timeline">
        {vendor.auditHistory.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No audit entries.</div>
        ) : vendor.auditHistory.map((e, i) => (
          <div key={i} className="timeline-item">
            <div className="body">
              <b>{e.action}</b> by {e.by}
              {e.field && <span style={{ marginLeft: 6, fontSize: 11.5, color: "var(--fg-3)" }}>{e.field}: {e.oldVal} → {e.newVal}</span>}
            </div>
            <div className="when">{fmtDate(e.at)}</div>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ width: "min(820px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-head">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)" }}>{vendor.vendorCode}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{vendor.legalName}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${statusBadge(vendor.status)}`}>{vendor.status}</span>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>{vendor.vendorType}</span>
              {vendor.msmeRegistered && <span className="badge badge-info" style={{ fontSize: 10 }}>MSME</span>}
              {gstins.length > 0 && <span className="badge badge-success" style={{ fontSize: 10 }}>GST · {gstins.length}</span>}
              {vendor.branches.length > 1 && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{vendor.branches.length} Branches</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: "1px solid var(--border)", paddingLeft: 22, paddingRight: 22, flexShrink: 0 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: tab === t ? 600 : 400, color: tab === t ? "var(--caveo-red)" : "var(--fg-3)", borderBottom: `2px solid ${tab === t ? "var(--caveo-red)" : "transparent"}`, marginBottom: -1, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="dp-body" style={{ flex: 1, overflowY: "auto" }}>
          {tabContent[tab]}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {caps.canDisable && vendor.status === "Active" && (
            <button className="btn-cav btn-cav-ghost" style={{ color: "var(--caveo-red)" }} onClick={() => { onDisable([vendor.id]); onClose(); }}>
              <Ban size={14} /> Disable
            </button>
          )}
          {caps.canEdit && (
            <button className="btn-cav btn-cav-primary" onClick={() => { onClose(); onEdit(vendor); }}>
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
