"use client";
import { useState } from "react";
import { Plus, Pencil, Check, X, Star, Phone, Mail } from "lucide-react";
import { CustomerContact, CustomerSite, CustomerCaps, DEPARTMENTS, DECISION_ROLES } from "../data";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const EMPTY_CONTACT: Omit<CustomerContact, "id"> = {
  name: "", designation: "", department: "Management", mobile: "", email: "",
  linkedSiteId: null, decisionRole: "Influencer", isPrimary: false,
};

const roleBadge = (r: string) => r === "Decision Maker" ? "badge-success" : r === "Commercial" ? "badge-warning" : r === "Technical" ? "badge-info" : "badge-neutral";

function ContactCard({ contact, sites, caps, onEdit, onSetPrimary }: { contact: CustomerContact; sites: CustomerSite[]; caps: CustomerCaps; onEdit: () => void; onSetPrimary: () => void }) {
  const site = sites.find((s) => s.id === contact.linkedSiteId);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${contact.isPrimary ? "var(--caveo-red)" : "var(--border)"}`, background: contact.isPrimary ? "rgba(200,16,46,0.02)" : "var(--surface-alt)" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--caveo-red)", flexShrink: 0 }}>
        {contact.name.slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{contact.name}</span>
          <span className={`badge ${roleBadge(contact.decisionRole)}`} style={{ fontSize: 10 }}>{contact.decisionRole}</span>
          {contact.isPrimary && <span className="badge badge-accent" style={{ fontSize: 10 }}>Primary</span>}
        </div>
        {contact.designation && <div className="cell-sub">{contact.designation} · {contact.department}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {contact.mobile && <span style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} />{contact.mobile}</span>}
          {contact.email && <span style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} />{contact.email}</span>}
        </div>
        {site && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Site: {site.siteName}</div>}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {!contact.isPrimary && caps.canEdit && <button title="Set Primary" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onSetPrimary}><Star size={13} /></button>}
        {caps.canEdit && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onEdit}><Pencil size={13} /></button>}
      </div>
    </div>
  );
}

function ContactForm({ initial, sites, onSave, onCancel }: { initial: Partial<CustomerContact>; sites: CustomerSite[]; onSave: (c: Omit<CustomerContact, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_CONTACT, ...initial });
  const set = (k: keyof typeof form, v: string | number | boolean | null) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ border: "1px solid var(--caveo-red)", borderRadius: 10, padding: 14, background: "rgba(200,16,46,0.01)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Designation</label><input value={form.designation} onChange={(e) => set("designation", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Department</label>
          <select value={form.department} onChange={(e) => set("department", e.target.value)} className={inputCls}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
        </div>
        <div><label className={labelCls}>Decision Role</label>
          <select value={form.decisionRole} onChange={(e) => set("decisionRole", e.target.value)} className={inputCls}>{DECISION_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
        <div><label className={labelCls}>Mobile</label><input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} className={inputCls} type="tel" /></div>
        <div><label className={labelCls}>Email</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} type="email" /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Linked Site</label>
          <select value={form.linkedSiteId ?? ""} onChange={(e) => set("linkedSiteId", e.target.value ? Number(e.target.value) : null)} className={inputCls}>
            <option value="">— None —</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={onCancel}><X size={13} /> Cancel</button>
        <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onSave(form)}><Check size={13} /> Save Contact</button>
      </div>
    </div>
  );
}

export default function CustomerContactManager({ contacts, sites, caps, onChange }: { contacts: CustomerContact[]; sites: CustomerSite[]; caps: CustomerCaps; onChange: (c: CustomerContact[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  let nextId = Math.max(0, ...contacts.map((c) => c.id)) + 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {contacts.map((c) =>
        editingId === c.id ? (
          <ContactForm key={c.id} initial={c} sites={sites} onSave={(d) => { onChange(contacts.map((x) => x.id === c.id ? { ...d, id: c.id } : x)); setEditingId(null); }} onCancel={() => setEditingId(null)} />
        ) : (
          <ContactCard key={c.id} contact={c} sites={sites} caps={caps} onEdit={() => setEditingId(c.id)} onSetPrimary={() => onChange(contacts.map((x) => ({ ...x, isPrimary: x.id === c.id })))} />
        )
      )}
      {adding && <ContactForm initial={{}} sites={sites} onSave={(d) => { onChange([...contacts, { ...d, id: nextId++ }]); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {!adding && caps.canEdit && <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}><Plus size={13} /> Add Contact</button>}
    </div>
  );
}
