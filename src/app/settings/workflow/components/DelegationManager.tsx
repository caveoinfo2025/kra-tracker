"use client";

import { useState, useEffect } from "react";
import { DelegationRule } from "@/lib/workflow-engine";

interface Props {
  canEdit: boolean;
}

export default function DelegationManager({ canEdit }: Props) {
  const [delegations, setDelegations] = useState<DelegationRule[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form, setForm] = useState({ toUser: "", module: "", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/delegations")
      .then((r) => r.json())
      .then((d) => setDelegations(d.delegations ?? []))
      .catch(() => setDelegations([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function handleSave() {
    if (!form.toUser || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      await fetch("/api/delegations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ toUser: Number(form.toUser), module: form.module || undefined, startDate: form.startDate, endDate: form.endDate, reason: form.reason || undefined }),
      });
      setShowForm(false);
      setForm({ toUser: "", module: "", startDate: "", endDate: "", reason: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: number) {
    await fetch(`/api/delegations/${id}`, { method: "DELETE" });
    load();
  }

  const now = new Date().toISOString();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>Delegation Rules</div>
          <div style={{ fontSize: 13, color: "var(--fg-4)" }}>Route approvals to a delegate when you are unavailable</div>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Delegation</button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>New Delegation</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Delegate To (Employee ID)</label>
              <input className="input" type="number" placeholder="Employee ID" value={form.toUser} onChange={(e) => setForm({ ...form, toUser: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Module (optional)</label>
              <input className="input" placeholder="FINANCE, CRM, … or leave blank for all" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Reason</label>
            <input className="input" placeholder="Annual leave, travel, …" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 32 }}>Loading…</div>
      ) : delegations.length === 0 ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 32 }}>No delegation rules. Create one to route approvals when you are unavailable.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Module</th>
                <th>Period</th>
                <th>Status</th>
                <th>Reason</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {delegations.map((d) => {
                const isActive = d.status === "ACTIVE" && d.startDate <= now && d.endDate >= now;
                return (
                  <tr key={d.id}>
                    <td style={{ fontSize: 13 }}>User #{d.fromUser}</td>
                    <td style={{ fontSize: 13 }}>User #{d.toUser}</td>
                    <td style={{ fontSize: 13 }}>{d.module ?? "All"}</td>
                    <td style={{ fontSize: 12, color: "var(--fg-4)", whiteSpace: "nowrap" }}>
                      {new Date(d.startDate).toLocaleDateString("en-IN")} → {new Date(d.endDate).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <span style={{ background: isActive ? "#22c55e18" : "#6b728018", color: isActive ? "#22c55e" : "#6b7280", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        {isActive ? "Active" : d.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--fg-4)" }}>{d.reason ?? "—"}</td>
                    {canEdit && (
                      <td>
                        {d.status === "ACTIVE" && (
                          <button className="btn-ghost" style={{ fontSize: 12, color: "#ef4444" }} onClick={() => handleRevoke(d.id)}>Revoke</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
