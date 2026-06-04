"use client";
import { useState } from "react";
import { Plus, Pencil, Check, X, Star, MapPin, Navigation } from "lucide-react";
import { CustomerSite, CustomerCaps, SITE_TYPES, STATE_NAMES, STATE_TO_CODE } from "../data";
import GSTRegistrationPanel from "../../vendors/components/GSTRegistrationPanel";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const EMPTY_SITE: Omit<CustomerSite, "id"> = {
  siteName: "", siteType: "Corporate Office", address: "", city: "",
  state: "Tamil Nadu", stateCode: "33", country: "India", pinCode: "",
  phone: "", email: "", isPrimary: false,
  gstRegistered: false, gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
  latitude: "", longitude: "", geoVerified: false,
};

function SiteCard({ site, caps, onEdit, onSetPrimary }: { site: CustomerSite; caps: CustomerCaps; onEdit: () => void; onSetPrimary: () => void }) {
  return (
    <div style={{ border: `1px solid ${site.isPrimary ? "var(--caveo-red)" : "var(--border)"}`, borderRadius: 12, padding: "14px 16px", background: site.isPrimary ? "rgba(200,16,46,0.02)" : "var(--surface-alt)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <MapPin size={16} style={{ color: "var(--fg-3)", marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>{site.siteName}</span>
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>{site.siteType}</span>
            {site.isPrimary && <span className="badge badge-accent" style={{ fontSize: 10 }}>Primary</span>}
            {site.geoVerified && <span className="badge badge-success" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}><Navigation size={9} /> Geo</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>{site.address}, {site.city}, {site.state} — {site.pinCode}</div>
          {site.phone && <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{site.phone}{site.email ? ` · ${site.email}` : ""}</div>}
          {site.gstRegistered && site.gstin && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>GST</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)" }}>{site.gstin}</span>
              <span className={`badge ${site.gstStatus === "Verified" ? "badge-success" : site.gstStatus === "Invalid" ? "badge-danger" : "badge-neutral"}`} style={{ fontSize: 10 }}>{site.gstStatus}</span>
            </div>
          )}
          {(site.latitude && site.longitude) && (
            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>📍 {site.latitude}, {site.longitude}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {!site.isPrimary && caps.canEdit && <button title="Set Primary" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onSetPrimary}><Star size={13} /></button>}
          {caps.canEdit && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onEdit}><Pencil size={13} /></button>}
        </div>
      </div>
    </div>
  );
}

function SiteForm({ initial, caps, onSave, onCancel }: { initial: Partial<CustomerSite>; caps: CustomerCaps; onSave: (s: Omit<CustomerSite, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_SITE, ...initial });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  function handleState(stateName: string) {
    setForm((f) => ({ ...f, state: stateName, stateCode: STATE_TO_CODE[stateName] ?? "" }));
  }
  const gstVal = { gstin: form.gstin, gstLegalName: form.gstLegalName, gstStatus: form.gstStatus, gstLedgerMapping: form.gstLedgerMapping };

  return (
    <div style={{ border: "1px solid var(--caveo-red)", borderRadius: 12, padding: 16, background: "rgba(200,16,46,0.01)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Site Name *</label><input value={form.siteName} onChange={(e) => set("siteName", e.target.value)} className={inputCls} placeholder="e.g. Corporate Office Chennai" /></div>
        <div><label className={labelCls}>Site Type</label>
          <select value={form.siteType} onChange={(e) => set("siteType", e.target.value)} className={inputCls}>{SITE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="sm:col-span-2"><label className={labelCls}>Address</label><textarea value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} rows={2} /></div>
        <div><label className={labelCls}>City</label><input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>State</label>
          <select value={form.state} onChange={(e) => handleState(e.target.value)} className={inputCls}>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div><label className={labelCls}>PIN Code</label><input value={form.pinCode} onChange={(e) => set("pinCode", e.target.value)} className={inputCls} maxLength={6} /></div>
        <div><label className={labelCls}>Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Email</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} type="email" /></div>
        {/* Geo */}
        <div><label className={labelCls}>Latitude</label><input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} className={inputCls} placeholder="13.0604" /></div>
        <div><label className={labelCls}>Longitude</label><input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} className={inputCls} placeholder="80.2496" /></div>
        <div className="sm:col-span-2">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.geoVerified} onChange={(e) => set("geoVerified", e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} />
            Geo-location verified (for engineer visits & conveyance distance)
          </label>
        </div>
      </div>

      {/* GST (reuses Vendor Master GST panel + validator) */}
      <div style={{ marginTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={form.gstRegistered} onChange={(e) => set("gstRegistered", e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} disabled={!caps.canManageGST} />
          GST Registered for this site
        </label>
        {form.gstRegistered && (
          <div style={{ marginTop: 12 }}>
            <GSTRegistrationPanel
              value={gstVal}
              onChange={(g) => setForm((f) => ({ ...f, gstin: g.gstin, gstLegalName: g.gstLegalName, gstStatus: g.gstStatus, gstLedgerMapping: g.gstLedgerMapping }))}
              branchStateCode={form.stateCode}
              branchStateName={form.state}
              readOnly={!caps.canManageGST}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={onCancel}><X size={13} /> Cancel</button>
        <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onSave(form)}><Check size={13} /> Save Site</button>
      </div>
    </div>
  );
}

export default function CustomerSiteManager({ sites, caps, onChange }: { sites: CustomerSite[]; caps: CustomerCaps; onChange: (s: CustomerSite[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  let nextId = Math.max(0, ...sites.map((s) => s.id)) + 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sites.map((s) =>
        editingId === s.id ? (
          <SiteForm key={s.id} initial={s} caps={caps} onSave={(d) => { onChange(sites.map((x) => x.id === s.id ? { ...d, id: s.id } : x)); setEditingId(null); }} onCancel={() => setEditingId(null)} />
        ) : (
          <SiteCard key={s.id} site={s} caps={caps} onEdit={() => setEditingId(s.id)} onSetPrimary={() => onChange(sites.map((x) => ({ ...x, isPrimary: x.id === s.id })))} />
        )
      )}
      {adding && <SiteForm initial={{}} caps={caps} onSave={(d) => { onChange([...sites, { ...d, id: nextId++ }]); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {!adding && caps.canEdit && <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}><Plus size={13} /> Add Site</button>}
    </div>
  );
}
