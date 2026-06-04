"use client";

import { useState, useEffect } from "react";
import { Plus, Search, RefreshCw, Copy, ChevronRight, FileText } from "lucide-react";
import type { PolicySummary, PolicyCategory, PolicyStatus } from "../data/policyDefaults";
import { statusBadge, statusColor, fmtDate, MOCK_POLICIES, MOCK_CATEGORIES } from "../data/policyDefaults";
import PolicyEditor from "./PolicyEditor";

const STATUS_FILTERS: Array<{ value: "" | PolicyStatus; label: string }> = [
  { value: "",         label: "All"       },
  { value: "DRAFT",    label: "Draft"     },
  { value: "REVIEW",   label: "In Review" },
  { value: "ACTIVE",   label: "Active"    },
  { value: "INACTIVE", label: "Inactive"  },
  { value: "ARCHIVED", label: "Archived"  },
];

interface Props { canEdit: boolean; }

export default function PolicyList({ canEdit }: Props) {
  const [policies,   setPolicies]   = useState<PolicySummary[]>([]);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [catFilter,  setCatFilter]  = useState<number | "">("");
  const [statusFilt, setStatusFilt] = useState<"" | PolicyStatus>("");
  const [editor,     setEditor]     = useState<{ open: boolean; policy?: PolicySummary }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/admin/policies"),
        fetch("/api/admin/policies/categories"),
      ]);
      const pData = pRes.ok ? await pRes.json() : MOCK_POLICIES;
      const cData = cRes.ok ? await cRes.json() : MOCK_CATEGORIES;
      setPolicies(Array.isArray(pData) ? pData : MOCK_POLICIES);
      setCategories(Array.isArray(cData) ? cData : MOCK_CATEGORIES);
    } catch {
      setPolicies(MOCK_POLICIES);
      setCategories(MOCK_CATEGORIES);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = policies.filter((p) => {
    if (statusFilt && p.status !== statusFilt) return false;
    if (catFilter  && p.categoryId !== catFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const kpis = [
    { label: "Total",    value: policies.length,                                 color: "var(--fg-2)"  },
    { label: "Active",   value: policies.filter((p) => p.status === "ACTIVE").length,   color: "#1F9D55" },
    { label: "Draft",    value: policies.filter((p) => p.status === "DRAFT").length,    color: "#6B7280" },
    { label: "In Review",value: policies.filter((p) => p.status === "REVIEW").length,   color: "#FF6B00" },
  ];

  async function handleClone(p: PolicySummary) {
    if (!canEdit) return;
    const body = {
      categoryId:  p.categoryId,
      name:        `${p.name} (Copy)`,
      code:        `${p.code}_COPY`,
      description: p.description,
      scopeType:   p.scopeType,
      rules:       p.rules ?? [],
    };
    try {
      const r = await fetch("/api/admin/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) load();
    } catch { /* no-op */ }
  }

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
        {kpis.map(({ label, value, color }) => (
          <div key={label} style={{ flex: "1 1 120px", padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)", pointerEvents: "none" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search policies…"
            style={{ width: "100%", padding: "7px 10px 7px 28px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>

        <select value={String(catFilter)} onChange={(e) => setCatFilter(e.target.value ? parseInt(e.target.value) : "")}
          style={selStyle}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={statusFilt} onChange={(e) => setStatusFilt(e.target.value as "" | PolicyStatus)}
          style={selStyle}>
          {STATUS_FILTERS.map(({ value, label }) => <option key={value || "_all"} value={value}>{label}</option>)}
        </select>

        <button onClick={load} style={{ ...iconBtn, opacity: loading ? 0.5 : 1 }} disabled={loading}>
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
        </button>

        {canEdit && (
          <button onClick={() => setEditor({ open: true, policy: undefined })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2} /> New Policy
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--fg-4)", fontSize: 13 }}>Loading policies…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <FileText size={24} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: "var(--fg-3)", marginBottom: 4 }}>No policies found</div>
          <div style={{ fontSize: 12, color: "var(--fg-4)" }}>{query || catFilter || statusFilt ? "Try adjusting your filters" : "Create your first policy to get started"}</div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)" }}>
                {["Policy", "Category", "Scope", "Version", "Status", "Effective", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase" as const, letterSpacing: "0.07em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  onClick={() => setEditor({ open: true, policy: p })}
                  style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", transition: "background var(--duration-fast)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{p.code}</div>
                    {p.ruleCount > 0 && <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>{p.ruleCount} rule{p.ruleCount !== 1 ? "s" : ""}</div>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{p.categoryName}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{p.scopeType}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>v{p.version}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 10.5 }}>{p.status}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                      {p.effectiveFrom ? fmtDate(p.effectiveFrom) : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button onClick={() => handleClone(p)} title="Clone policy"
                          style={{ ...iconBtn, padding: 4 }}>
                          <Copy size={12} strokeWidth={2} />
                        </button>
                      )}
                      <button onClick={() => setEditor({ open: true, policy: p })} title="Open"
                        style={{ ...iconBtn, padding: 4 }}>
                        <ChevronRight size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status legend */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" as const }}>
          {(["ACTIVE", "REVIEW", "DRAFT", "INACTIVE", "ARCHIVED"] as PolicyStatus[]).map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-4)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(s), display: "inline-block" }} />
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </div>
          ))}
        </div>
      )}

      {editor.open && (
        <PolicyEditor
          policy={editor.policy}
          categories={categories}
          canEdit={canEdit}
          onClose={() => setEditor({ open: false })}
          onSaved={() => { setEditor({ open: false }); load(); }}
        />
      )}
    </div>
  );
}

// ── Local styles ───────────────────────────────────────────────────────────────

const selStyle: React.CSSProperties = {
  padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
  fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none",
};

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 6, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
  background: "transparent", color: "var(--fg-3)", cursor: "pointer",
};
