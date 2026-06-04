"use client";

import { useState, useEffect } from "react";
import { Search, Activity, ArrowRight } from "lucide-react";
import type { PolicyAuditRecord, AuditAction } from "../data/policyDefaults";
import { MOCK_AUDIT, fmtDate } from "../data/policyDefaults";

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATED:        "Created",
  UPDATED:        "Updated",
  STATUS_CHANGED: "Status Changed",
  RULE_ADDED:     "Rule Added",
  RULE_REMOVED:   "Rule Removed",
  PUBLISHED:      "Published",
  ARCHIVED:       "Archived",
};

const ACTION_COLOR: Record<AuditAction, string> = {
  CREATED:        "#1F9D55",
  UPDATED:        "#0066FF",
  STATUS_CHANGED: "#FF6B00",
  RULE_ADDED:     "#0066FF",
  RULE_REMOVED:   "#C8102E",
  PUBLISHED:      "#1F9D55",
  ARCHIVED:       "#6B7280",
};

export default function PolicyAudit() {
  const [records, setRecords] = useState<PolicyAuditRecord[]>(MOCK_AUDIT);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<AuditAction | "">("");

  useEffect(() => {
    fetch("/api/admin/policies/audit")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setRecords(d))
      .catch(() => {});
  }, []);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const okQ = !q || r.policyName.toLowerCase().includes(q) || r.performedBy.toLowerCase().includes(q);
    const okF = !filter || r.action === filter;
    return okQ && okF;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policy, actor…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as AuditAction | "")}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
          <option value="">All Actions</option>
          {(Object.keys(ACTION_LABEL) as AuditAction[]).map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <Activity size={24} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>No audit records found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Date", "Policy", "Action", "Change", "Actor"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--fg-4)", whiteSpace: "nowrap" }}>{fmtDate(r.createdAt)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--fg-1)" }}>{r.policyName}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: ACTION_COLOR[r.action], background: `${ACTION_COLOR[r.action]}14`, padding: "2px 8px", borderRadius: 999 }}>
                      {ACTION_LABEL[r.action]}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.oldValue || r.newValue ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-3)" }}>
                        {r.oldValue && <span style={{ background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 4 }}>{r.oldValue}</span>}
                        {r.oldValue && r.newValue && <ArrowRight size={11} style={{ color: "var(--fg-4)" }} />}
                        {r.newValue && <span style={{ background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 4 }}>{r.newValue}</span>}
                      </div>
                    ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--fg-3)" }}>{r.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--fg-4)" }}>{filtered.length} of {records.length} events</div>
    </div>
  );
}
