"use client";

import { useEffect, useState } from "react";

interface Policy {
  id: number; companyId: number | null; customerType: string;
  gstRequired: boolean; panRequired: boolean; duplicateThreshold: number;
  creditApprovalRequired: boolean; status: string;
}

interface Props { canEdit: boolean; currentUserId: number }

export default function CustomerGovernance({ canEdit, currentUserId: _uid }: Props) {
  const [policy, setPolicy]   = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [gst, setGst]         = useState(true);
  const [pan, setPan]         = useState(false);
  const [threshold, setThr]   = useState("80");
  const [credit, setCredit]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customer-policy");
      if (res.ok) {
        const json = await res.json() as { policy?: Policy };
        if (json.policy) {
          setPolicy(json.policy);
          setGst(json.policy.gstRequired);
          setPan(json.policy.panRequired);
          setThr(String(json.policy.duplicateThreshold));
          setCredit(json.policy.creditApprovalRequired);
        }
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/customer-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstRequired: gst, panRequired: pan,
          duplicateThreshold: Number(threshold),
          creditApprovalRequired: credit,
        }),
      });
      if (res.ok) {
        setSaved(true); setEditing(false);
        setTimeout(() => setSaved(false), 2500);
        await load();
      }
    } finally { setSaving(false); }
  }

  if (loading) return <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Customer Governance Policy</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
            Global rules applied during customer creation and management.
          </p>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} style={btnStyle("var(--primary)")}>Edit Policy</button>
        )}
      </div>

      {saved && (
        <div style={{ background: "#1F9D5520", border: "1px solid #1F9D55", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#1F9D55" }}>
          Policy saved successfully.
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, maxWidth: 520 }}>
        {[
          {
            label: "GST Number Required",
            desc:  "Enforce GST registration number on customer creation",
            value: editing ? gst : (policy?.gstRequired ?? true),
            setter: setGst,
          },
          {
            label: "PAN Required",
            desc:  "Require PAN for all customer records",
            value: editing ? pan : (policy?.panRequired ?? false),
            setter: setPan,
          },
          {
            label: "Credit Approval Required",
            desc:  "Trigger approval workflow for credit-limit requests",
            value: editing ? credit : (policy?.creditApprovalRequired ?? false),
            setter: setCredit,
          },
        ].map(({ label, desc, value, setter }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{desc}</div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: editing ? "pointer" : "default" }}>
              <input
                type="checkbox"
                checked={value as boolean}
                disabled={!editing}
                onChange={e => setter(e.target.checked)}
              />
              <span style={{ fontSize: 12, color: value ? "#1F9D55" : "#888" }}>
                {value ? "Yes" : "No"}
              </span>
            </label>
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Duplicate Detection Threshold</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, marginBottom: 8 }}>
            Fuzzy-match score (0–100) above which a customer is flagged as a potential duplicate.
          </div>
          {editing ? (
            <input
              type="number" min="0" max="100"
              value={threshold} onChange={e => setThr(e.target.value)}
              style={{ width: 80, padding: "6px 10px", fontSize: 13, borderRadius: 7, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }}
            />
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
              {policy?.duplicateThreshold ?? 80}%
            </span>
          )}
        </div>

        {editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={btnStyle("var(--primary)")}>{saving ? "Saving…" : "Save Policy"}</button>
            <button onClick={() => setEditing(false)} style={btnStyle("#888")}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 5,
  padding: "7px 14px", fontSize: 12, fontWeight: 600,
  borderRadius: 7, border: `1px solid ${color}`,
  color: color, background: "transparent", cursor: "pointer",
});
