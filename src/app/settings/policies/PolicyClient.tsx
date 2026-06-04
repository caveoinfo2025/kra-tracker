"use client";

import { useState } from "react";
import { ArrowLeft, ScrollText, ClipboardList } from "lucide-react";
import Link from "next/link";
import PolicyList  from "./components/PolicyList";
import PolicyAudit from "./components/PolicyAudit";

type TabId = "policies" | "audit";

interface Props { canEdit: boolean; }

export default function PolicyClient({ canEdit }: Props) {
  const [tab, setTab] = useState<TabId>("policies");

  const tabs: Array<{ id: TabId; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
    { id: "policies", label: "Policies",  Icon: ScrollText    },
    { id: "audit",    label: "Audit Log", Icon: ClipboardList },
  ];

  return (
    <div style={{ maxWidth: 1200, padding: "28px 32px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/settings" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-4)" }}>
            <ArrowLeft size={12} strokeWidth={2} /> Admin Console
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "rgba(200,16,46,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ScrollText size={19} strokeWidth={1.6} style={{ color: "var(--caveo-red)" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--fg-1)", fontFamily: "var(--font-display)" }}>
                Policy Engine
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-3)", marginTop: 3 }}>
                Business rules, approval thresholds, and automated policy enforcement
              </p>
            </div>
          </div>
          {!canEdit && (
            <div style={{ padding: "6px 12px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)", fontSize: 11.5, color: "var(--fg-4)", border: "1px solid var(--border)" }}>
              View-only mode
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" as const }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "none", borderBottom: active ? "2px solid var(--caveo-red)" : "2px solid transparent", background: "transparent", fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: "pointer", whiteSpace: "nowrap" as const, marginBottom: -1 }}>
              <Icon size={13} strokeWidth={2} />{label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "policies" && <PolicyList  canEdit={canEdit} />}
      {tab === "audit"    && <PolicyAudit />}
    </div>
  );
}
