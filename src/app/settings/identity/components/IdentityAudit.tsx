"use client";

import { useState } from "react";
import { Search, UserPlus, UserX, UserMinus, Shield, ShieldOff, Key, GitMerge } from "lucide-react";
import type { IdentityAuditRecord, AuditAction } from "../data/identityDefaults";
import { MOCK_AUDIT, fmtDate } from "../data/identityDefaults";

const ACTION_LABEL: Record<AuditAction, string> = {
  USER_CREATED:        "User Created",
  USER_DEACTIVATED:    "Deactivated",
  USER_SUSPENDED:      "Suspended",
  ROLE_CREATED:        "Role Created",
  ROLE_MODIFIED:       "Role Modified",
  ROLE_ASSIGNED:       "Role Assigned",
  ROLE_REVOKED:        "Role Revoked",
  PERMISSION_GRANTED:  "Permission Granted",
  PERMISSION_REVOKED:  "Permission Revoked",
  POLICY_UPDATED:      "Policy Updated",
  DELEGATION_ADDED:    "Delegation Added",
  DELEGATION_CANCELLED:"Delegation Cancelled",
};

const ACTION_BADGE: Record<AuditAction, string> = {
  USER_CREATED:        "badge-success",
  USER_DEACTIVATED:    "badge-neutral",
  USER_SUSPENDED:      "badge-warning",
  ROLE_CREATED:        "badge-success",
  ROLE_MODIFIED:       "badge-warning",
  ROLE_ASSIGNED:       "badge-success",
  ROLE_REVOKED:        "badge-neutral",
  PERMISSION_GRANTED:  "badge-success",
  PERMISSION_REVOKED:  "badge-neutral",
  POLICY_UPDATED:      "badge-warning",
  DELEGATION_ADDED:    "badge-success",
  DELEGATION_CANCELLED:"badge-neutral",
};

const ACTION_ICON: Record<AuditAction, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  USER_CREATED:        UserPlus,
  USER_DEACTIVATED:    UserX,
  USER_SUSPENDED:      UserMinus,
  ROLE_CREATED:        Shield,
  ROLE_MODIFIED:       Shield,
  ROLE_ASSIGNED:       Key,
  ROLE_REVOKED:        ShieldOff,
  PERMISSION_GRANTED:  Key,
  PERMISSION_REVOKED:  ShieldOff,
  POLICY_UPDATED:      Shield,
  DELEGATION_ADDED:    GitMerge,
  DELEGATION_CANCELLED:GitMerge,
};

const ACTION_GROUPS: Array<{ label: string; values: AuditAction[] }> = [
  { label: "User Events",        values: ["USER_CREATED", "USER_DEACTIVATED", "USER_SUSPENDED"] },
  { label: "Role Events",        values: ["ROLE_CREATED", "ROLE_MODIFIED", "ROLE_ASSIGNED", "ROLE_REVOKED"] },
  { label: "Permission Events",  values: ["PERMISSION_GRANTED", "PERMISSION_REVOKED", "POLICY_UPDATED"] },
  { label: "Delegation Events",  values: ["DELEGATION_ADDED", "DELEGATION_CANCELLED"] },
];

export default function IdentityAudit() {
  const [records]         = useState<IdentityAuditRecord[]>(MOCK_AUDIT);
  const [search, setSearch]           = useState("");
  const [filterAction, setFilterAction] = useState<string>("");

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const okQ = !search || r.actor.toLowerCase().includes(q) || r.target.toLowerCase().includes(q) || ACTION_LABEL[r.action].toLowerCase().includes(q);
    const okA = !filterAction || r.action === filterAction;
    return okQ && okA;
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Identity Audit Log</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>Track all user, role, permission, and delegation changes.</div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--infra-blue)", marginTop: 4, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
          <strong>Sample data shown.</strong> Live audit entries will appear after the identity management migration is applied and changes are made through this console.
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, target…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
          <option value="">All Actions</option>
          {ACTION_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.values.map((v) => <option key={v} value={v}>{ACTION_LABEL[v]}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No audit records match your filters</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Date", "Action", "Actor", "Target", "Change"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const Icon = ACTION_ICON[r.action];
                return (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon size={11} strokeWidth={2} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
                        <span className={`badge ${ACTION_BADGE[r.action]}`} style={{ fontSize: 10 }}>{ACTION_LABEL[r.action]}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-2)" }}>{r.actor}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 12.5, color: "var(--fg-1)" }}>{r.target}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {r.oldValue && r.newValue ? (
                        <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                          <span style={{ textDecoration: "line-through" }}>{r.oldValue || "—"}</span>
                          <span style={{ margin: "0 4px" }}>→</span>
                          <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>{r.newValue}</span>
                        </div>
                      ) : r.newValue ? (
                        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{r.newValue}</span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--fg-4)" }}>
        {filtered.length} of {records.length} record{records.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
