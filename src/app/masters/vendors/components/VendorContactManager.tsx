"use client";
import { useState } from "react";
import { Plus, Pencil, Check, X, Star, Phone, Mail } from "lucide-react";
import { VendorContact, VendorCaps, CONTACT_TYPES } from "../data";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const EMPTY_CONTACT: Omit<VendorContact, "id"> = {
  name: "", designation: "", department: "", mobile: "", email: "", contactType: "Sales", isPrimary: false,
};

const contactTypeBadge = (t: string) => t === "Management" ? "badge-info" : t === "Accounts" ? "badge-warning" : t === "Support" ? "badge-neutral" : "badge-success";

function ContactCard({ contact, caps, onEdit, onSetPrimary }: { contact: VendorContact; caps: VendorCaps; onEdit: () => void; onSetPrimary: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${contact.isPrimary ? "var(--caveo-red)" : "var(--border)"}`, background: contact.isPrimary ? "rgba(200,16,46,0.02)" : "var(--surface-alt)" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--caveo-red)", flexShrink: 0 }}>
        {contact.name.slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{contact.name}</span>
          <span className={`badge ${contactTypeBadge(contact.contactType)}`} style={{ fontSize: 10 }}>{contact.contactType}</span>
          {contact.isPrimary && <span className="badge badge-accent" style={{ fontSize: 10 }}>Primary</span>}
        </div>
        {contact.designation && <div className="cell-sub">{contact.designation}{contact.department ? ` · ${contact.department}` : ""}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {contact.mobile && <span style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} />{contact.mobile}</span>}
          {contact.email && <span style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} />{contact.email}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {!contact.isPrimary && caps.canEdit && <button title="Set Primary" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onSetPrimary}><Star size={13} /></button>}
        {caps.canEdit && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onEdit}><Pencil size={13} /></button>}
      </div>
    </div>
  );
}

function ContactForm({ initial, onSave, onCancel }: { initial: Partial<VendorContact>; onSave: (c: Omit<VendorContact, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_CONTACT, ...initial });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ border: "1px solid var(--caveo-red)", borderRadius: 10, padding: 14, background: "rgba(200,16,46,0.01)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Contact Type</label>
          <select value={form.contactType} onChange={(e) => set("contactType", e.target.value)} className={inputCls}>
            {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Designation</label><input value={form.designation} onChange={(e) => set("designation", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Department</label><input value={form.department} onChange={(e) => set("department", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Mobile</label><input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} className={inputCls} type="tel" /></div>
        <div><label className={labelCls}>Email</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} type="email" /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={onCancel}><X size={13} /> Cancel</button>
        <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onSave(form)}><Check size={13} /> Save Contact</button>
      </div>
    </div>
  );
}

export default function VendorContactManager({ contacts, caps, onChange }: { contacts: VendorContact[]; caps: VendorCaps; onChange: (c: VendorContact[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  let nextId = Math.max(0, ...contacts.map((c) => c.id)) + 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {contacts.map((c) =>
        editingId === c.id ? (
          <ContactForm key={c.id} initial={c} onSave={(d) => { onChange(contacts.map((x) => x.id === c.id ? { ...d, id: c.id } : x)); setEditingId(null); }} onCancel={() => setEditingId(null)} />
        ) : (
          <ContactCard key={c.id} contact={c} caps={caps} onEdit={() => setEditingId(c.id)} onSetPrimary={() => onChange(contacts.map((x) => ({ ...x, isPrimary: x.id === c.id })))} />
        )
      )}
      {adding && <ContactForm initial={{}} onSave={(d) => { onChange([...contacts, { ...d, id: nextId++ }]); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {!adding && caps.canEdit && <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}><Plus size={13} /> Add Contact</button>}
    </div>
  );
}
