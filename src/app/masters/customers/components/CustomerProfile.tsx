"use client";
import { useState } from "react";
import { X, Pencil, Ban, Phone, Mail, Navigation } from "lucide-react";
import {
  Customer, CustomerCaps, CustomerSite, CustomerContact,
  primarySite, primaryContact, allGSTINs, statusBadge, getParentName,
  fmtINR, grossMargin, marginPct, todayISO,
} from "../data";
import CustomerSiteManager from "./CustomerSiteManager";
import CustomerContactManager from "./CustomerContactManager";
import CustomerGSTPanel from "./CustomerGSTPanel";
import CustomerHierarchyViewer from "./CustomerHierarchyViewer";
import CustomerAssetPanel from "./CustomerAssetPanel";
import CustomerProfitabilityPanel from "./CustomerProfitabilityPanel";
import CustomerDocumentPanel from "./CustomerDocumentPanel";
import CustomerTimeline from "./CustomerTimeline";
import CustomerRelationshipViewer from "./CustomerRelationshipViewer";

type Tab = "Overview" | "Sites" | "GST" | "Contacts" | "Hierarchy" | "Opportunities" | "Projects" | "Assets" | "Support" | "Finance" | "Documents" | "Audit";
const TABS: Tab[] = ["Overview", "Sites", "GST", "Contacts", "Hierarchy", "Opportunities", "Projects", "Assets", "Support", "Finance", "Documents", "Audit"];

export default function CustomerProfile({
  customer, allCustomers, caps, onClose, onEdit, onDisable, onChange, onSelect,
}: {
  customer: Customer;
  allCustomers: Customer[];
  caps: CustomerCaps;
  onClose: () => void;
  onEdit: (c: Customer) => void;
  onDisable: (ids: number[]) => void;
  onChange: (c: Customer) => void;
  onSelect: (c: Customer) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const c = customer;
  const ps = primarySite(c);
  const pc = primaryContact(c);
  const gstins = allGSTINs(c);

  const Row = ({ k, v }: { k: string; v?: string | React.ReactNode }) =>
    v ? <><div className="kv-key">{k}</div><div className="kv-val">{v}</div></> : null;

  const stamp = () => ({ modifiedBy: "You", modifiedAt: todayISO() });
  const updateSites = (sites: CustomerSite[]) => onChange({ ...c, sites, ...stamp() });
  const updateContacts = (contacts: CustomerContact[]) => onChange({ ...c, contacts, ...stamp() });

  const tabContent: Record<Tab, React.ReactNode> = {
    Overview: (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="section-label">Company</div>
          <div className="kv-grid">
            <Row k="Code" v={<span style={{ fontFamily: "var(--font-mono)", color: "var(--caveo-red)" }}>{c.customerCode}</span>} />
            <Row k="Legal Name" v={c.legalName} />
            {c.tradeName !== c.legalName && <Row k="Trade Name" v={c.tradeName} />}
            <Row k="Type" v={<span className="badge badge-neutral" style={{ fontSize: 10 }}>{c.customerType}</span>} />
            <Row k="Industry" v={c.industry} />
            <Row k="Website" v={c.website || undefined} />
            <Row k="PAN" v={<span style={{ fontFamily: "var(--font-mono)" }}>{c.pan}</span>} />
            <Row k="Account Owner" v={c.accountOwner} />
            <Row k="Status" v={<span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>} />
            {c.parentId && <Row k="Parent Group" v={getParentName(allCustomers, c.parentId)} />}
            {c.parentId && c.relationshipType && <Row k="Relationship" v={c.relationshipType} />}
          </div>
        </div>
        {ps && (
          <div>
            <div className="section-label">Primary Location</div>
            <div className="kv-grid">
              <Row k="Site" v={ps.siteName} />
              <Row k="Address" v={`${ps.address}, ${ps.city}, ${ps.state} — ${ps.pinCode}`} />
              <Row k="Phone" v={ps.phone || undefined} />
              {ps.geoVerified && <Row k="Geo" v={<span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--success)" }}><Navigation size={12} /> Verified ({ps.latitude}, {ps.longitude})</span>} />}
            </div>
          </div>
        )}
        {pc && (
          <div>
            <div className="section-label">Primary Contact</div>
            <div className="kv-grid">
              <Row k="Name" v={pc.name} />
              <Row k="Designation" v={pc.designation || undefined} />
              <Row k="Role" v={pc.decisionRole} />
              <Row k="Mobile" v={pc.mobile} />
              <Row k="Email" v={pc.email || undefined} />
            </div>
          </div>
        )}
        {/* Commercial — finance roles only */}
        {caps.canViewFinance && (
          <div>
            <div className="section-label">Commercial</div>
            <div className="kv-grid">
              <Row k="Payment Terms" v={c.commercial.paymentTerms} />
              <Row k="Credit Limit" v={fmtINR(c.commercial.creditLimit)} />
              <Row k="Rating" v={<span className="badge badge-accent" style={{ fontSize: 10 }}>{c.commercial.rating}</span>} />
              <Row k="Currency" v={c.commercial.currency} />
              <Row k="Tax Category" v={c.commercial.taxCategory} />
            </div>
          </div>
        )}
        {/* Profit snapshot */}
        {caps.canViewFinance && c.profitability.revenue > 0 && (
          <div>
            <div className="section-label">Profitability Snapshot</div>
            <div className="kv-grid">
              <Row k="Revenue" v={fmtINR(c.profitability.revenue)} />
              <Row k="Gross Margin" v={<span style={{ color: grossMargin(c.profitability) >= 0 ? "var(--success)" : "var(--caveo-red)", fontWeight: 600 }}>{fmtINR(grossMargin(c.profitability))} ({marginPct(c.profitability)}%)</span>} />
            </div>
          </div>
        )}
      </div>
    ),
    Sites: <CustomerSiteManager sites={c.sites} caps={caps} onChange={updateSites} />,
    GST: <CustomerGSTPanel customer={c} />,
    Contacts: <CustomerContactManager contacts={c.contacts} sites={c.sites} caps={caps} onChange={updateContacts} />,
    Hierarchy: <CustomerHierarchyViewer customer={c} allCustomers={allCustomers} onSelect={onSelect} />,
    Opportunities: <CustomerRelationshipViewer customer={c} kind="Opportunities" caps={caps} />,
    Projects: <CustomerRelationshipViewer customer={c} kind="Projects" caps={caps} />,
    Assets: <CustomerAssetPanel assets={c.assets} sites={c.sites} caps={caps} onAdd={() => alert("Add asset — coming soon")} />,
    Support: <CustomerRelationshipViewer customer={c} kind="Support" caps={caps} />,
    Finance: caps.canViewFinance
      ? <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <CustomerProfitabilityPanel profitability={c.profitability} />
          <div><div className="section-label">Invoices & Payments</div><CustomerRelationshipViewer customer={c} kind="Finance" caps={caps} /></div>
        </div>
      : <div style={{ textAlign: "center", padding: "40px", fontSize: 13, color: "var(--fg-4)" }}>Finance details are restricted to Finance & Admin roles.</div>,
    Documents: <CustomerDocumentPanel documents={c.documents} caps={caps} onAdd={() => alert("Upload — coming soon")} />,
    Audit: <CustomerTimeline history={c.auditHistory} />,
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ width: "min(840px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)" }}>{c.customerCode}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{c.legalName}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>{c.customerType}</span>
              {gstins.length > 0 && <span className="badge badge-success" style={{ fontSize: 10 }}>GST · {gstins.length}</span>}
              {c.sites.length > 1 && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{c.sites.length} Sites</span>}
              {c.hasActiveAMC && <span className="badge badge-info" style={{ fontSize: 10 }}>AMC Active</span>}
              {c.parentId && <span className="badge badge-accent" style={{ fontSize: 10 }}>Group: {getParentName(allCustomers, c.parentId)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        {/* Quick-action row (mobile-style shortcuts on desktop too) */}
        {pc && (
          <div style={{ display: "flex", gap: 8, padding: "10px 22px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
            <a href={`tel:${pc.mobile}`} className="btn-cav btn-cav-secondary btn-cav-sm"><Phone size={13} /> Call</a>
            <a href={`mailto:${pc.email}`} className="btn-cav btn-cav-secondary btn-cav-sm"><Mail size={13} /> Email</a>
            {ps?.latitude && <a href={`https://maps.google.com/?q=${ps.latitude},${ps.longitude}`} target="_blank" rel="noreferrer" className="btn-cav btn-cav-secondary btn-cav-sm"><Navigation size={13} /> Navigate</a>}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: "1px solid var(--border)", paddingLeft: 22, paddingRight: 22, flexShrink: 0 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 13px", fontSize: 12.5, fontWeight: tab === t ? 600 : 400, color: tab === t ? "var(--caveo-red)" : "var(--fg-3)", borderBottom: `2px solid ${tab === t ? "var(--caveo-red)" : "transparent"}`, marginBottom: -1, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>
          ))}
        </div>

        <div className="dp-body" style={{ flex: 1, overflowY: "auto" }}>{tabContent[tab]}</div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {caps.canDisable && c.status !== "Inactive" && (
            <button className="btn-cav btn-cav-ghost" style={{ color: "var(--caveo-red)" }} onClick={() => { onDisable([c.id]); onClose(); }}><Ban size={14} /> Disable</button>
          )}
          {caps.canEdit && <button className="btn-cav btn-cav-primary" onClick={() => { onClose(); onEdit(c); }}><Pencil size={14} /> Edit</button>}
        </div>
      </div>
    </div>
  );
}
