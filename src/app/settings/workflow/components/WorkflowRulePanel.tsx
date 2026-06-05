"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { WorkflowDefinition } from "@/lib/workflow-engine";
import WorkflowDesigner from "./WorkflowDesigner";

interface Props { canEdit: boolean }

const MODULE_LABEL: Record<string, string> = {
  FINANCE:     "Finance",
  CRM:         "CRM / Sales",
  MASTERS:     "Master Data",
  HR:          "HR",
  PROCUREMENT: "Procurement",
  ADMIN:       "Administration",
};

const TRIGGER_LABEL: Record<string, string> = {
  EXPENSE_SUBMITTED:           "Expense Submitted",
  ADVANCE_REQUESTED:           "Advance Requested",
  PAYMENT_APPROVED:            "Payment Approved",
  VOUCHER_CREATED:             "Voucher Created",
  OPPORTUNITY_LARGE_DEAL:      "Large Deal Opportunity",
  DISCOUNT_REQUESTED:          "Discount Requested",
  CONTRACT_SUBMITTED:          "Contract Submitted",
  CUSTOMER_CREATION_REQUESTED: "Customer Creation",
  VENDOR_CREATION_REQUESTED:   "Vendor Creation",
  LEAVE_APPLIED:               "Leave Application",
  SALARY_REVISION:             "Salary Revision",
  ASSET_REQUESTED:             "Asset Request",
  PURCHASE_REQUESTED:          "Purchase Request",
  VENDOR_ONBOARDING:           "Vendor Onboarding",
  USER_ACCESS_CHANGE:          "User Access Change",
  POLICY_CHANGE:               "Policy Change",
  CONFIG_CHANGE:               "Configuration Change",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   "#22c55e",
  DRAFT:    "#f59e0b",
  INACTIVE: "#6b7280",
};

export default function WorkflowRulePanel({ canEdit }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<WorkflowDefinition | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [search,    setSearch]    = useState("");
  const [statusF,   setStatusF]   = useState("ALL");
  const [moduleF,   setModuleF]   = useState("ALL");

  function load() {
    setLoading(true);
    fetch("/api/workflows")
      .then((r) => r.json() as Promise<{ workflows?: WorkflowDefinition[] }>)
      .then((d) => setWorkflows(d.workflows ?? []))
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleStatusChange(wf: WorkflowDefinition, newStatus: string) {
    await fetch(`/api/workflows/${wf.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    load();
  }

  const modules = Array.from(new Set(workflows.map((w) => w.module)));

  const filtered = workflows.filter((w) => {
    const s = search.toLowerCase();
    return (
      (!s || w.name.toLowerCase().includes(s) || w.code.toLowerCase().includes(s)) &&
      (statusF === "ALL" || w.status === statusF) &&
      (moduleF === "ALL" || w.module === moduleF)
    );
  });

  // ── Edit / Create view ────────────────────────────────────────────────────────
  if (creating || selected) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => { setCreating(false); setSelected(null); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 13, borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--fg-2)", cursor: "pointer" }}
          >
            <ArrowLeft size={13} /> Back
          </button>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-1)" }}>
            {creating ? "New Workflow" : selected?.name}
          </span>
        </div>
        <WorkflowDesigner
          workflow={selected}
          canEdit={canEdit}
          onSaved={() => { setCreating(false); setSelected(null); load(); }}
          onCancel={() => { setCreating(false); setSelected(null); }}
        />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          style={{ flex: 1, minWidth: 180, ...inputSt }}
        />
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ width: 130, ...inputSt }}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select value={moduleF} onChange={(e) => setModuleF(e.target.value)} style={{ width: 150, ...inputSt }}>
          <option value="ALL">All modules</option>
          {modules.map((m) => <option key={m} value={m}>{MODULE_LABEL[m] ?? m}</option>)}
        </select>
        <button
          onClick={load}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", fontSize: 12, borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--fg-3)", cursor: "pointer" }}
        >
          <RefreshCw size={13} />
        </button>
        {canEdit && (
          <button
            onClick={() => setCreating(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 7, border: "none", background: "var(--caveo-red)", color: "#fff", cursor: "pointer" }}
          >
            <Plus size={14} /> New Workflow
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {(["ACTIVE", "DRAFT", "INACTIVE"] as const).map((s) => {
          const count = workflows.filter((w) => w.status === s).length;
          return (
            <div key={s} style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--fg-4)", marginBottom: 6 }}>{s}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLOR[s] }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 40 }}>No workflows found.</div>
      ) : (
        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}>
                {["Name", "Module", "Trigger Event", "Steps", "Version", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((wf) => (
                <tr
                  key={wf.id}
                  onClick={() => setSelected(wf)}
                  style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--fg-1)" }}>{wf.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "monospace", marginTop: 2 }}>{wf.code}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-2)" }}>
                    {MODULE_LABEL[wf.module] ?? wf.module}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-2)" }}>
                    {TRIGGER_LABEL[wf.triggerEvent] ?? wf.triggerEvent}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-2)", textAlign: "center" }}>
                    {wf.steps?.length ?? 0}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-4)", fontSize: 12 }}>
                    v{wf.version}
                  </td>
                  <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <span style={{
                      display: "inline-block",
                      background: `${STATUS_COLOR[wf.status] ?? "#6b7280"}18`,
                      color: STATUS_COLOR[wf.status] ?? "#6b7280",
                      borderRadius: 20, padding: "3px 10px",
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {wf.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    {canEdit && wf.status === "DRAFT"    && <button style={ghostBtn} onClick={() => handleStatusChange(wf, "ACTIVE")}>Activate</button>}
                    {canEdit && wf.status === "ACTIVE"   && <button style={{ ...ghostBtn, color: "#ef4444" }} onClick={() => handleStatusChange(wf, "INACTIVE")}>Deactivate</button>}
                    {canEdit && wf.status === "INACTIVE" && <button style={ghostBtn} onClick={() => handleStatusChange(wf, "ACTIVE")}>Re-activate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputSt: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, borderRadius: 7,
  border: "1px solid var(--border)", background: "var(--bg-elev)",
  color: "var(--fg-1)", outline: "none",
};
const ghostBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: 12, borderRadius: 6,
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--fg-2)", cursor: "pointer",
};
