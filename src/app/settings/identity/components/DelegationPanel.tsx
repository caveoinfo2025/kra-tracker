"use client";

import { useState } from "react";
import { Plus, GitMerge, X, Calendar } from "lucide-react";
import type { DelegationRule, DelegationStatus } from "../data/identityDefaults";
import { MOCK_DELEGATIONS, MOCK_USERS, fmtDate } from "../data/identityDefaults";

const STATUS_BADGE: Record<DelegationStatus, string> = {
  ACTIVE:    "badge-success",
  EXPIRED:   "badge-neutral",
  CANCELLED: "badge-warning",
};

const SCOPE_OPTIONS = [
  { value: "all",      label: "All Modules" },
  { value: "CRM",      label: "CRM" },
  { value: "Finance",  label: "Finance" },
  { value: "Workflow", label: "Workflow" },
  { value: "Reports",  label: "Reports" },
  { value: "Masters",  label: "Masters" },
  { value: "Settings", label: "Settings" },
];

type FormData = { fromUserId: string; toUserId: string; scope: string; fromDate: string; toDate: string; reason: string; };
const EMPTY: FormData = { fromUserId: "", toUserId: "", scope: "all", fromDate: "", toDate: "", reason: "" };

interface Props { canEdit: boolean; }

export default function DelegationPanel({ canEdit }: Props) {
  const [rules, setRules]       = useState<DelegationRule[]>(MOCK_DELEGATIONS);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm]         = useState<FormData>(EMPTY);
  const [error, setError]       = useState("");
  const [toast, setToast]       = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function handleSave() {
    if (!form.fromUserId || !form.toUserId) { setError("Both delegator and delegate are required."); return; }
    if (!form.fromDate || !form.toDate)     { setError("Start and end dates are required."); return; }
    if (form.fromUserId === form.toUserId)  { setError("Delegator and delegate must be different users."); return; }
    const fromUser = MOCK_USERS.find((u) => u.id.toString() === form.fromUserId);
    const toUser   = MOCK_USERS.find((u) => u.id.toString() === form.toUserId);
    const newRule: DelegationRule = {
      id: rules.length + 1,
      fromUserId: Number(form.fromUserId), fromUserName: fromUser?.name ?? "—",
      toUserId:   Number(form.toUserId),   toUserName:   toUser?.name  ?? "—",
      scope: form.scope, fromDate: form.fromDate, toDate: form.toDate,
      reason: form.reason, status: "ACTIVE",
    };
    setRules((r) => [newRule, ...r]);
    flash("Delegation rule created."); setFormOpen(false); setForm(EMPTY); setError("");
  }

  function handleCancel(id: number) {
    setRules((rs) => rs.map((r) => r.id === id ? { ...r, status: "CANCELLED" as DelegationStatus } : r));
    flash("Delegation cancelled.");
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Delegation Rules</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>Temporary permission delegation for leave and out-of-office coverage.</div>
        </div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY); setError(""); setFormOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2.5} /> Add Delegation
          </button>
        )}
      </div>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--infra-blue)", marginTop: 4, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
          <strong>Client-side only.</strong> Delegation rules will persist after the workflow DB migration is applied.
        </span>
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <GitMerge size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No delegation rules configured</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["From", "To", "Scope", "Period", "Reason", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < rules.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--fg-1)", fontSize: 12.5 }}>{r.fromUserName}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--fg-2)" }}>{r.toUserName}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{r.scope === "all" ? "All Modules" : r.scope}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} strokeWidth={2} style={{ color: "var(--fg-4)" }} />
                      {r.fromDate} → {r.toDate}
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 11.5, color: "var(--fg-3)", maxWidth: 180 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason || "—"}</div>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className={`badge ${STATUS_BADGE[r.status]}`} style={{ fontSize: 10 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {canEdit && r.status === "ACTIVE" && (
                      <button onClick={() => handleCancel(r.id)}
                        style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(200,16,46,0.3)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}>
                        <X size={10} strokeWidth={2} /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over form */}
      {formOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.4)" }} onClick={() => setFormOpen(false)} />
          <div style={{ position: "relative", width: 440, background: "var(--surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>New Delegation</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>Temporarily delegate access from one user to another.</div>
              </div>
              <button onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}><X size={16} strokeWidth={2} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* From user */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Delegating From <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select value={form.fromUserId} onChange={(e) => setForm((f) => ({ ...f, fromUserId: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}>
                    <option value="">Select user…</option>
                    {MOCK_USERS.filter((u) => u.employmentStatus === "ACTIVE").map((u) => <option key={u.id} value={u.id.toString()}>{u.name}</option>)}
                  </select>
                </div>
                {/* To user */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Delegating To <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select value={form.toUserId} onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}>
                    <option value="">Select user…</option>
                    {MOCK_USERS.filter((u) => u.employmentStatus === "ACTIVE").map((u) => <option key={u.id} value={u.id.toString()}>{u.name}</option>)}
                  </select>
                </div>
                {/* Scope */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Permission Scope</label>
                  <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}>
                    {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {/* Dates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Start Date <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input type="date" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                      style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>End Date <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input type="date" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                      style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
                  </div>
                </div>
                {/* Reason */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Reason</label>
                  <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3}
                    placeholder="e.g. Annual leave, conference travel"
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none", resize: "vertical" as const, fontFamily: "var(--font-sans)" }} />
                </div>
                {error && <div style={{ padding: "8px 12px", background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: 4, fontSize: 12, color: "var(--danger)" }}>{error}</div>}
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setFormOpen(false)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--caveo-red)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create Delegation</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
    </div>
  );
}
