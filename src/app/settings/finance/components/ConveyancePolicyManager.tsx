"use client";

import { useState } from "react";
import type { ConveyancePolicyRecord } from "@/lib/finance-engine";

const VEHICLE_TYPES = ["Bike", "Car", "Auto", "Cab", "Public Transport", "Two-Wheeler (Own)"];

interface Props {
  initialPolicies: ConveyancePolicyRecord[];
}

export default function ConveyancePolicyManager({ initialPolicies }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    vehicleType: "",
    ratePerKm: "",
    monthlyLimitRupees: "",
    googleMapRequired: false,
    allowManualOverride: true,
    overrideApprovalRequired: false,
  });

  async function handleCreate() {
    if (!form.vehicleType || !form.ratePerKm) { setError("Vehicle type and rate are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/finance/conveyance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleType: form.vehicleType,
          ratePerKm: Number(form.ratePerKm),
          monthlyLimitRupees: form.monthlyLimitRupees ? Number(form.monthlyLimitRupees) : 0,
          googleMapRequired: form.googleMapRequired,
          allowManualOverride: form.allowManualOverride,
          overrideApprovalRequired: form.overrideApprovalRequired,
        }),
      });
      const data = await res.json() as { policy?: ConveyancePolicyRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.policy) setPolicies((prev) => [...prev, data.policy!]);
      setForm({ vehicleType: "", ratePerKm: "", monthlyLimitRupees: "", googleMapRequired: false, allowManualOverride: true, overrideApprovalRequired: false });
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleToggle(p: ConveyancePolicyRecord) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/finance/conveyance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, status: newStatus }),
    });
    if (res.ok) setPolicies((prev) => prev.map((x) => x.id === p.id ? { ...x, status: newStatus } : x));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Conveyance Policies</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            Per-km reimbursement rates and monthly limits by vehicle type.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 7, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          + Add Rate
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>New Conveyance Policy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Vehicle Type *</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              >
                <option value="">Select vehicle type</option>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Rate per km (₹) *</label>
              <input
                type="number" min="0" step="0.5"
                value={form.ratePerKm}
                onChange={(e) => setForm((f) => ({ ...f, ratePerKm: e.target.value }))}
                placeholder="e.g. 3.5"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Monthly limit (₹)</label>
              <input
                type="number" min="0"
                value={form.monthlyLimitRupees}
                onChange={(e) => setForm((f) => ({ ...f, monthlyLimitRupees: e.target.value }))}
                placeholder="0 = no limit"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.googleMapRequired} onChange={(e) => setForm((f) => ({ ...f, googleMapRequired: e.target.checked }))} />
                Google Map Required
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.allowManualOverride} onChange={(e) => setForm((f) => ({ ...f, allowManualOverride: e.target.checked }))} />
                Allow Manual Override
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.overrideApprovalRequired} onChange={(e) => setForm((f) => ({ ...f, overrideApprovalRequired: e.target.checked }))} />
                Override Needs Approval
              </label>
            </div>
          </div>
          {error && <p style={{ fontSize: 12, color: "var(--caveo-red)", marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Policy"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "7px 16px", fontSize: 13, borderRadius: 6, background: "transparent", border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {policies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
            No conveyance policies configured yet.
          </div>
        ) : policies.map((p) => (
          <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{p.vehicleType}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--caveo-red)" }}>₹{p.ratePerKm}/km</span>
                {p.monthlyLimitRupees > 0 && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Limit: ₹{p.monthlyLimitRupees}/mo</span>}
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 600, background: p.status === "active" ? "rgba(0,180,0,0.1)" : "rgba(200,16,46,0.1)", color: p.status === "active" ? "#00AA00" : "var(--caveo-red)" }}>
                  {p.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {p.googleMapRequired && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Map required</span>}
                {p.allowManualOverride && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Manual override allowed</span>}
                {p.overrideApprovalRequired && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Override needs approval</span>}
              </div>
            </div>
            <button onClick={() => handleToggle(p)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}>
              {p.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
