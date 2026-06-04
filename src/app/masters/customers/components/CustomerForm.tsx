"use client";
import { useState, useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import {
  Customer, CustomerSite, CustomerCaps, CustomerType, CustomerStatus,
  CUSTOMER_TYPES, CUSTOMER_STATUSES, INDUSTRIES, RELATIONSHIP_TYPES,
  PAYMENT_TERMS, CUSTOMER_RATINGS, CURRENCIES, TAX_CATEGORIES,
  nextCustomerCode, todayISO, findPossibleDuplicates,
} from "../data";
import CustomerSiteManager from "./CustomerSiteManager";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="section-label">{title}</div>{children}</div>;
}

const DEFAULT_SITE: Omit<CustomerSite, "id"> = {
  siteName: "Head Office", siteType: "Registered Office", address: "", city: "",
  state: "Tamil Nadu", stateCode: "33", country: "India", pinCode: "",
  phone: "", email: "", isPrimary: true,
  gstRegistered: false, gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
  latitude: "", longitude: "", geoVerified: false,
};

export default function CustomerForm({
  initial, caps, currentUser, allCustomers, nextId, onClose, onSave,
}: {
  initial: Customer | null;
  caps: CustomerCaps;
  currentUser: string;
  allCustomers: Customer[];
  nextId: number;
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const ed = initial;
  const isReadOnly = !caps.canEdit && !caps.canCreate;

  // A. Basic
  const [legalName, setLegalName] = useState(ed?.legalName ?? "");
  const [tradeName, setTradeName] = useState(ed?.tradeName ?? "");
  const [customerType, setCustomerType] = useState<CustomerType>(ed?.customerType ?? "Enterprise");
  const [industry, setIndustry] = useState(ed?.industry ?? "Information Technology");
  const [website, setWebsite] = useState(ed?.website ?? "");
  const [status, setStatus] = useState<CustomerStatus>(ed?.status ?? "Prospect");
  const [accountOwner, setAccountOwner] = useState(ed?.accountOwner ?? currentUser);
  const [pan, setPan] = useState(ed?.pan ?? "");

  // Hierarchy
  const [parentId, setParentId] = useState<number | null>(ed?.parentId ?? null);
  const [relationshipType, setRelationshipType] = useState(ed?.relationshipType ?? "");

  // Commercial
  const [paymentTerms, setPaymentTerms] = useState(ed?.commercial.paymentTerms ?? "Net 30");
  const [creditLimit, setCreditLimit] = useState(String(ed?.commercial.creditLimit ?? 1000000));
  const [rating, setRating] = useState(ed?.commercial.rating ?? "B");
  const [currency, setCurrency] = useState(ed?.commercial.currency ?? "INR");
  const [taxCategory, setTaxCategory] = useState(ed?.commercial.taxCategory ?? "Regular");

  // Sites
  const [sites, setSites] = useState<CustomerSite[]>(ed?.sites ?? [{ ...DEFAULT_SITE, id: 1 }]);

  const [error, setError] = useState("");

  // Duplicate detection (create only)
  const duplicates = useMemo(() => {
    if (ed) return [];
    const emailDomain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return findPossibleDuplicates(allCustomers, {
      legalName, pan, gstin: sites.find((s) => s.gstin)?.gstin, emailDomain,
    });
  }, [ed, legalName, pan, sites, website, allCustomers]);

  const parents = allCustomers.filter((c) => c.parentId === null && (!ed || c.id !== ed.id));

  function handleSave() {
    if (!legalName.trim()) { setError("Legal Company Name is required."); return; }
    setError("");
    const now = todayISO();
    const customer: Customer = {
      id: ed?.id ?? nextId,
      customerCode: ed?.customerCode ?? nextCustomerCode(allCustomers),
      legalName: legalName.trim(),
      tradeName: tradeName.trim() || legalName.trim(),
      customerType, industry, website: website.trim(), status,
      accountOwner: accountOwner.trim(),
      pan: pan.trim().toUpperCase(),
      parentId, relationshipType: parentId ? relationshipType : "",
      sites,
      contacts: ed?.contacts ?? [],
      assets: ed?.assets ?? [],
      documents: ed?.documents ?? [],
      commercial: caps.canManageCommercial || !ed
        ? { paymentTerms, creditLimit: parseFloat(creditLimit) || 0, rating, currency, taxCategory }
        : ed.commercial,
      profitability: ed?.profitability ?? { revenue: 0, productCost: 0, serviceCost: 0, engineerTravel: 0, customerExpenses: 0 },
      hasActiveAMC: ed?.hasActiveAMC ?? false,
      createdBy: ed?.createdBy ?? currentUser,
      createdAt: ed?.createdAt ?? now,
      modifiedBy: ed ? currentUser : undefined,
      modifiedAt: ed ? now : undefined,
      auditHistory: ed
        ? [...ed.auditHistory, { action: "Updated", by: currentUser, at: now }]
        : [{ action: "Created", by: currentUser, at: now }],
    };
    onSave(customer);
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ width: "min(640px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{ed ? `Edit — ${ed.legalName}` : "New Customer"}</div>
            {ed && <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", marginTop: 2 }}>{ed.customerCode}</div>}
            {isReadOnly && <span className="badge badge-neutral" style={{ fontSize: 10, marginTop: 6, display: "inline-block" }}>View Only</span>}
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        <div className="dp-body">
          {error && <div style={{ background: "#FFF0F0", border: "1px solid #FCCACA", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "var(--caveo-red)" }}>{error}</div>}

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div style={{ background: "#FFF8E6", border: "1px solid #F5D98B", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#B05000" }}>
                <AlertTriangle size={14} /> Possible duplicate customer found
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>
                Matches on name / PAN / GST / email domain:
                {duplicates.slice(0, 3).map((d) => (
                  <span key={d.id} style={{ display: "block", marginTop: 3 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--caveo-red)" }}>{d.customerCode}</span> · {d.legalName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* A. Basic Information */}
          <Section title="A. Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ed && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Customer Code</label>
                  <input value={ed.customerCode} readOnly className={inputCls} style={{ background: "var(--bg-muted)", fontFamily: "var(--font-mono)", color: "var(--caveo-red)" }} />
                </div>
              )}
              <div className="sm:col-span-2"><label className={labelCls}>Legal Company Name *</label><input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputCls} placeholder="As registered" disabled={isReadOnly} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Trade Name</label><input value={tradeName} onChange={(e) => setTradeName(e.target.value)} className={inputCls} placeholder="Display name" disabled={isReadOnly} /></div>
              <div><label className={labelCls}>Customer Type</label>
                <select value={customerType} onChange={(e) => setCustomerType(e.target.value as CustomerType)} className={inputCls} disabled={isReadOnly}>{CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div><label className={labelCls}>Industry</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls} disabled={isReadOnly}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
              </div>
              <div><label className={labelCls}>Website</label><input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="example.com" disabled={isReadOnly} /></div>
              <div><label className={labelCls}>PAN</label><input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className={inputCls} maxLength={10} placeholder="AABCC1234A" style={{ fontFamily: "var(--font-mono)" }} disabled={isReadOnly} /></div>
              <div><label className={labelCls}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)} className={inputCls} disabled={isReadOnly}>{CUSTOMER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div><label className={labelCls}>Account Owner</label><input value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)} className={inputCls} disabled={isReadOnly} /></div>
            </div>
          </Section>

          {/* Hierarchy */}
          <Section title="Customer Hierarchy">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Parent Customer</label>
                <select value={parentId ?? ""} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)} className={inputCls} disabled={isReadOnly}>
                  <option value="">— None (Top-level) —</option>
                  {parents.map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
                </select>
              </div>
              {parentId && (
                <div><label className={labelCls}>Relationship Type</label>
                  <select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} className={inputCls} disabled={isReadOnly}>
                    <option value="">Select…</option>
                    {RELATIONSHIP_TYPES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
          </Section>

          {/* Commercial */}
          <Section title="Commercial Information">
            {!caps.canManageCommercial && ed ? (
              <div style={{ fontSize: 12, color: "var(--fg-4)" }}>Commercial terms are managed by Finance & Admin roles.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Payment Terms</label>
                  <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={inputCls}>{PAYMENT_TERMS.map((p) => <option key={p}>{p}</option>)}</select>
                </div>
                <div><label className={labelCls}>Credit Limit (₹)</label><input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Customer Rating</label>
                  <select value={rating} onChange={(e) => setRating(e.target.value)} className={inputCls}>{CUSTOMER_RATINGS.map((r) => <option key={r}>{r}</option>)}</select>
                </div>
                <div><label className={labelCls}>Preferred Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
                <div><label className={labelCls}>Tax Category</label>
                  <select value={taxCategory} onChange={(e) => setTaxCategory(e.target.value)} className={inputCls}>{TAX_CATEGORIES.map((t) => <option key={t}>{t}</option>)}</select>
                </div>
              </div>
            )}
          </Section>

          {/* Sites */}
          <Section title="Sites & GST Registrations">
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>
              Each site can hold its own GST registration; GST state code is validated against the site state.
            </div>
            <CustomerSiteManager sites={sites} caps={caps} onChange={setSites} />
          </Section>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={onClose}>Cancel</button>
          {!isReadOnly && <button className="btn-cav btn-cav-primary" onClick={handleSave}>{ed ? "Save Changes" : "Create Customer"}</button>}
        </div>
      </div>
    </div>
  );
}
