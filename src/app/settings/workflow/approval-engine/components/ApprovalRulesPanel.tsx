"use client";

import { Workflow } from "../data";

interface Props {
  workflows: Workflow[];
}

export default function ApprovalRulesPanel({ workflows }: Props) {
  const allConditions = workflows.flatMap((w) =>
    w.conditions.map((c) => ({ ...c, workflowName: w.name, module: w.module }))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1)" }}>Approval Rules</div>
          <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>
            Conditions that trigger approval workflows across all modules.
          </div>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: 11 }}>{allConditions.length} rules across {workflows.length} workflows</span>
      </div>

      {workflows.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
          No workflows configured yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {workflows.filter((w) => w.conditions.length > 0).map((w) => (
            <div key={w.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-muted)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)" }}>{w.name}</span>
                <span className="badge badge-info" style={{ fontSize: 10 }}>{w.module}</span>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{w.transactionType}</span>
                <span className={`badge ${w.status === "Active" ? "badge-success" : "badge-neutral"}`} style={{ fontSize: 10, marginLeft: "auto" }}>{w.status}</span>
              </div>
              <div style={{ padding: "8px 16px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-4)", marginBottom: 8 }}>
                  Conditions ({w.conditions.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {w.conditions.map((c, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                      background: "var(--bg-muted)", borderRadius: 7, padding: "7px 12px", fontSize: 12,
                    }}>
                      {i > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "var(--fg-4)",
                          background: "var(--bg-elev)", border: "1px solid var(--border)",
                          borderRadius: 4, padding: "1px 6px",
                        }}>{c.conjunction ?? "AND"}</span>
                      )}
                      <span style={{ fontWeight: 600, color: "var(--fg-1)" }}>{c.field}</span>
                      <span style={{ color: "var(--fg-4)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{c.operator}</span>
                      <span style={{ color: "var(--caveo-red)", fontWeight: 600 }}>
                        {Array.isArray(c.value) ? c.value.join(" – ") : String(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--fg-4)" }}>
                  Trigger: <b style={{ color: "var(--fg-2)" }}>{w.triggerEvent}</b>
                  &nbsp;·&nbsp;
                  {w.levels.length} approval level{w.levels.length !== 1 ? "s" : ""}
                  &nbsp;·&nbsp;
                  SLA: {w.levels[0]?.slaHours ?? "—"}h
                </div>
              </div>
            </div>
          ))}

          {workflows.filter((w) => w.conditions.length === 0).length > 0 && (
            <div className="card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 12, color: "var(--fg-4)" }}>
                {workflows.filter((w) => w.conditions.length === 0).length} workflow(s) have no conditions configured (always trigger on {workflows.find((w) => w.conditions.length === 0)?.triggerEvent ?? "submit"}).
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
