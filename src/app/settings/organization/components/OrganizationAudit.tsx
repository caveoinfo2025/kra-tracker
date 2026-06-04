"use client";

import { useState } from "react";
import { Search, Building2, GitBranch, Layers, Users, Award, CheckCircle2, AlertCircle, PlusCircle, Edit2 } from "lucide-react";
import type { OrgAuditRecord, AuditAction } from "../data/organization.types";
import { MOCK_AUDIT, fmtDate } from "../data/organization.types";

const ACTION_BADGE: Record<AuditAction, string> = {
  CREATED:     "badge-success",
  UPDATED:     "badge-warning",
  ACTIVATED:   "badge-success",
  DEACTIVATED: "badge-neutral",
};

const ACTION_ICON: Record<AuditAction, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  CREATED:     PlusCircle,
  UPDATED:     Edit2,
  ACTIVATED:   CheckCircle2,
  DEACTIVATED: AlertCircle,
};

const ENTITY_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Company:     Building2,
  Branch:      GitBranch,
  Department:  Layers,
  Team:        Users,
  Designation: Award,
};

export default function OrganizationAudit() {
  const [records]    = useState<OrgAuditRecord[]>(MOCK_AUDIT);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<AuditAction | "">("");
  const [filterEntity, setFilterEntity] = useState("");

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const okQ = !search || r.entityName.toLowerCase().includes(q) || r.actor.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q);
    const okA = !filterAction || r.action === filterAction;
    const okE = !filterEntity || r.entity === filterEntity;
    return okQ && okA && okE;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Organization Audit Log</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>
          Track all changes to your organization structure — who changed what and when.
        </div>
      </div>

      {/* Notice: live data pending migration */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--infra-blue)", marginTop: 4, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
          <strong>Sample data shown.</strong> Live audit entries will appear here after the organization DB migration is applied and changes are made through this console.
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, actor…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
          <option value="">All Entities</option>
          {["Company", "Branch", "Department", "Team", "Designation"].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value as AuditAction | "")}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
          <option value="">All Actions</option>
          {(["CREATED", "UPDATED", "ACTIVATED", "DEACTIVATED"] as AuditAction[]).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No audit records match your filters</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Date", "Entity", "Name", "Action", "Actor", "Change"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const ActionIcon = ACTION_ICON[r.action];
                const EntityIcon = ENTITY_ICON[r.entity] ?? Building2;
                return (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <EntityIcon size={12} strokeWidth={2} style={{ color: "var(--fg-4)" }} />
                        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{r.entity}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--fg-1)", fontSize: 12.5 }}>{r.entityName}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <ActionIcon size={11} strokeWidth={2} style={{ color: r.action === "DEACTIVATED" ? "var(--fg-4)" : r.action === "CREATED" || r.action === "ACTIVATED" ? "#1F9D55" : "#FF6B00" }} />
                        <span className={`badge ${ACTION_BADGE[r.action]}`} style={{ fontSize: 10 }}>{r.action}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-2)" }}>{r.actor}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {r.oldValue && (
                        <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                          <span style={{ textDecoration: "line-through" }}>{r.oldValue}</span>
                          <span style={{ margin: "0 4px", color: "var(--fg-4)" }}>→</span>
                          <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>{r.newValue}</span>
                        </div>
                      )}
                      {!r.oldValue && r.newValue && (
                        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{r.newValue}</span>
                      )}
                      {!r.oldValue && !r.newValue && (
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
        {filtered.length} of {records.length} audit record{records.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
