"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Workflow } from "../data";

interface Props {
  workflows: Workflow[];
}

export default function EscalationRulesPanel({ workflows }: Props) {
  const withEscalation   = workflows.filter((w) => !!w.escalation);
  const withoutEscalation = workflows.filter((w) => !w.escalation && w.status === "Active");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1)" }}>Escalation Rules</div>
          <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>
            Automatically escalate pending approvals that breach their SLA.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="badge badge-success" style={{ fontSize: 11 }}>{withEscalation.length} configured</span>
          {withoutEscalation.length > 0 && (
            <span className="badge badge-warning" style={{ fontSize: 11 }}>{withoutEscalation.length} missing</span>
          )}
        </div>
      </div>

      {/* Configured escalations */}
      {withEscalation.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {withEscalation.map((w) => {
            const e = w.escalation!;
            return (
              <div key={w.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{
                  padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-muted)", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)" }}>{w.name}</span>
                  <span className="badge badge-info" style={{ fontSize: 10 }}>{w.module}</span>
                  <span className={`badge ${w.status === "Active" ? "badge-success" : "badge-neutral"}`} style={{ fontSize: 10, marginLeft: "auto" }}>
                    {w.status}
                  </span>
                </div>

                <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  <EscCell label="Escalate After" icon={<Clock size={12} />}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1)" }}>{e.afterHours}h</span>
                    <span style={{ fontSize: 11, color: "var(--fg-4)" }}>of SLA breach</span>
                  </EscCell>
                  <EscCell label="Escalate To">
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{e.escalateTo}</span>
                    {e.specificUser && <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{e.specificUser}</span>}
                  </EscCell>
                  <EscCell label="Reminder Frequency">
                    {e.repeatEvery
                      ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>Every {e.repeatEvery}h</span>
                      : <span style={{ fontSize: 12, color: "var(--fg-4)" }}>No repeat</span>}
                  </EscCell>
                  <EscCell label="Max Escalations">
                    {e.maxEscalations
                      ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{e.maxEscalations}×</span>
                      : <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Unlimited</span>}
                  </EscCell>
                </div>

                <div style={{ padding: "0 16px 12px", display: "flex", gap: 16, fontSize: 11, color: "var(--fg-4)" }}>
                  {w.levels.map((l) => (
                    <span key={l.id}>
                      Level {l.level} — <b style={{ color: "var(--fg-2)" }}>{l.slaHours}h SLA</b> ({l.label})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workflows missing escalation */}
      {withoutEscalation.length > 0 && (
        <div className="card" style={{ padding: "12px 16px", background: "rgba(255,107,0,0.04)", border: "1px solid rgba(255,107,0,0.2)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--ot-orange)" }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <b>Active workflows without escalation rules:</b>
              <div style={{ marginTop: 4, color: "var(--fg-3)" }}>
                {withoutEscalation.map((w) => w.name).join(", ")}
              </div>
              <div style={{ marginTop: 4, fontSize: 11.5 }}>
                Approvals in these workflows will not auto-escalate when SLA is breached.
                Edit the workflow to add an escalation rule.
              </div>
            </div>
          </div>
        </div>
      )}

      {withEscalation.length === 0 && withoutEscalation.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
          No active workflows found.
        </div>
      )}

      {/* Explanation */}
      <div className="card" style={{ padding: "12px 16px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.7 }}>
          <b style={{ color: "var(--fg-2)" }}>How escalation works:</b> When an approval request
          has not been acted upon within the configured SLA, it is automatically escalated to
          the designated role or user. Reminders are sent at the specified frequency until the
          request is actioned or the maximum escalation count is reached.
          Configure escalation per workflow in the Workflow Builder (Step 5 — Escalation).
        </div>
      </div>
    </div>
  );
}

function EscCell({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-4)", marginBottom: 6 }}>
        {icon}{label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}
