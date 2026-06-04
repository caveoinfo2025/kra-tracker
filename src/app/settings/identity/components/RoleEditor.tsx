"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { IdentityRole } from "../data/identityDefaults";

interface Props {
  role:    IdentityRole | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

type FormData = { name: string; description: string; level: string; };
const EMPTY: FormData = { name: "", description: "", level: "30" };

export default function RoleEditor({ role, onClose, onSaved }: Props) {
  const [form, setForm]     = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (role) setForm({ name: role.name, description: role.description, level: role.level.toString() });
    else      setForm(EMPTY);
    setError("");
  }, [role]);

  async function handleSave() {
    if (!form.name.trim())                       { setError("Role name is required."); return; }
    const level = parseInt(form.level, 10);
    if (isNaN(level) || level < 1 || level > 100) { setError("Level must be between 1 and 100."); return; }

    setSaving(true); setError("");
    try {
      const url    = role ? `/api/admin/identity/roles/${role.id}` : "/api/admin/identity/roles";
      const method = role ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), level }) });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Save failed."); setSaving(false); return; }
      onSaved();
    } catch { setError("Network error."); }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.4)" }} onClick={onClose} />
      <div style={{ position: "relative", width: 440, background: "var(--surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{role ? "Edit Role" : "New Role"}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>
              {role ? "Modify role name, description, and level." : "Create a custom role to assign to users."}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}><X size={16} strokeWidth={2} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* System role warning */}
            {role?.isSystemRole && (
              <div style={{ padding: "10px 14px", background: "rgba(255,107,0,0.07)", border: "1px solid rgba(255,107,0,0.2)", borderRadius: "var(--radius-md)", fontSize: 12, color: "#FF6B00" }}>
                This is a system role. Name and level changes apply globally. Exercise caution.
              </div>
            )}

            {/* Role Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Role Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Finance Manager"
                style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>

            {/* Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="Describe what this role can do and who it's for"
                style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none", resize: "vertical" as const, fontFamily: "var(--font-sans)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>

            {/* Level */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Authority Level <span style={{ color: "var(--danger)" }}>*</span></label>
              <input type="number" min={1} max={100} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none", maxWidth: 120 }}
                onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              <div style={{ fontSize: 11, color: "var(--fg-4)" }}>1 = lowest, 100 = highest. Controls role hierarchy ordering and approval chains.</div>
            </div>

            {/* Level reference */}
            <div style={{ padding: "10px 14px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-4)", marginBottom: 6 }}>LEVEL REFERENCE</div>
              {[
                { label: "Super Admin",     level: 100 },
                { label: "Business Head",   level: 90  },
                { label: "Sales Head",      level: 70  },
                { label: "Finance Manager", level: 60  },
                { label: "Sales Manager",   level: 50  },
                { label: "Account Manager", level: 30  },
              ].map((ref) => (
                <div key={ref.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "2px 0", color: "var(--fg-3)" }}>
                  <span>{ref.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>{ref.level}</span>
                </div>
              ))}
            </div>

            {error && <div style={{ padding: "8px 12px", background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: 4, fontSize: 12, color: "var(--danger)" }}>{error}</div>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving…" : role ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
