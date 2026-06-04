"use client";

import { useState } from "react";
import { Plus, Trash2, UserCheck } from "lucide-react";
import { DelegationRule, ApprovalCaps, MODULES, fmtDate } from "../data";

interface Props {
  delegations: DelegationRule[];
  caps: ApprovalCaps;
  onAdd:    (d: Omit<DelegationRule, "id">) => void;
  onRemove: (id: number) => void;
}

const BLANK: Omit<DelegationRule, "id"> = {
  fromEmployee: "",
  toEmployee: "",
  modules: [],
  fromDate: "",
  toDate: "",
  reason: "",
  status: "Pending",
  createdAt: "2026-06-04",
};

const INPUT_STYLE = { width: "100%", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)" };

export default function DelegationPanel({ delegations, caps, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<DelegationRule, "id">>({ ...BLANK });

  function patch<K extends keyof Omit<DelegationRule, "id">>(k: K, v: Omit<DelegationRule, "id">[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.fromEmployee || !form.toEmployee || !form.fromDate || !form.toDate) return;
    onAdd(form);
    setForm({ ...BLANK });
    setShowForm(false);
  }

  const canManage = caps.canManageDelegations || caps.canDelegate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1)" }}>Delegation Rules</div>
          <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>Temporarily delegate approval authority during absences.</div>
        </div>
        {canManage && (
          <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={13} /> Add Delegation
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "var(--fg-1)" }}>New Delegation</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Delegator (From)">
              <input style={INPUT_STYLE} placeholder="Employee name" value={form.fromEmployee} onChange={(e) => patch("fromEmployee", e.target.value)} />
            </FormRow>
            <FormRow label="Delegatee (To)">
              <input style={INPUT_STYLE} placeholder="Employee name" value={form.toEmployee} onChange={(e) => patch("toEmployee", e.target.value)} />
            </FormRow>
            <FormRow label="Module(s)">
              <select style={INPUT_STYLE} value={form.modules[0] ?? ""} onChange={(e) => patch("modules", e.target.value ? [e.target.value] : [])}>
                <option value="">All Modules</option>
                {MODULES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </FormRow>
            <FormRow label="Reason">
              <input style={INPUT_STYLE} placeholder="e.g. Annual leave" value={form.reason} onChange={(e) => patch("reason", e.target.value)} />
            </FormRow>
            <FormRow label="From Date">
              <input type="date" style={INPUT_STYLE} value={form.fromDate} onChange={(e) => patch("fromDate", e.target.value)} />
            </FormRow>
            <FormRow label="To Date">
              <input type="date" style={INPUT_STYLE} value={form.toDate} onChange={(e) => patch("toDate", e.target.value)} />
            </FormRow>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={submit}>Save Delegation</button>
            <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => { setShowForm(false); setForm({ ...BLANK }); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Delegation list */}
      <div className="card" style={{ overflow: "hidden" }}>
        {delegations.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--fg-4)", fontSize: 13 }}>
            No delegation rules configured.
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Delegator</th>
                <th>Delegatee</th>
                <th>Module(s)</th>
                <th>Period</th>
                <th>Reason</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {delegations.map((d) => {
                const today = "2026-06-04";
                const isEffective = d.status === "Active" && d.fromDate <= today && d.toDate >= today;
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <UserCheck size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{d.fromEmployee}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{d.toEmployee}</td>
                    <td>
                      {d.modules.length === 0
                        ? <span className="badge badge-info" style={{ fontSize: 10 }}>All</span>
                        : d.modules.map((m) => (
                          <span key={m} className="badge badge-info" style={{ fontSize: 10, marginRight: 3 }}>{m}</span>
                        ))}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--fg-3)" }}>
                      {fmtDate(d.fromDate)} → {fmtDate(d.toDate)}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{d.reason || "—"}</td>
                    <td>
                      <span className={`badge ${isEffective ? "badge-success" : d.fromDate > today ? "badge-info" : "badge-neutral"}`} style={{ fontSize: 10 }}>
                        {isEffective ? "Active" : d.fromDate > today ? "Upcoming" : d.status}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <button className="btn-cav btn-cav-secondary btn-cav-sm" title="Remove"
                          style={{ color: "var(--caveo-red)" }} onClick={() => onRemove(d.id)}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: "12px 16px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.7 }}>
          <b style={{ color: "var(--fg-2)" }}>How delegation works:</b><br />
          During the delegation period, all approval requests assigned to the <b>Delegator</b> are also routed to the <b>Delegatee</b>.
          Either party can act on the request. Delegation applies only to the selected module(s), or all modules if none specified.
          Expired delegations are retained for audit purposes.
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
