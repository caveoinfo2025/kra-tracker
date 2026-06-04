import { Clock, Shield, GitBranch, Landmark, Settings } from "lucide-react";
import type { RecentChange } from "../data/adminModules";
import { RECENT_CHANGES } from "../data/adminModules";

const TYPE_ICON = {
  role:     Shield,
  workflow: GitBranch,
  policy:   Landmark,
  setting:  Settings,
} as const;

const TYPE_COLOR = {
  role:     "#C8102E",
  workflow: "#FF6B00",
  policy:   "#1F9D55",
  setting:  "#0066FF",
} as const;

function ChangeRow({ change }: { change: RecentChange }) {
  const Icon = TYPE_ICON[change.type];
  const color = TYPE_COLOR[change.type];

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: "var(--radius-sm)",
        background: `${color}12`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
      }}>
        <Icon size={13} strokeWidth={1.8} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)", lineHeight: 1.3 }}>
          {change.message}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>
          {change.module} · {change.actor}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <Clock size={10} strokeWidth={1.8} style={{ color: "var(--fg-4)" }} />
        <span style={{ fontSize: 10.5, color: "var(--fg-4)" }}>{change.timeAgo}</span>
      </div>
    </div>
  );
}

export default function RecentChanges() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header">
        <div>
          <div className="ch-title">Recent Changes</div>
          <div className="ch-sub">Last configuration updates</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {RECENT_CHANGES.map((change) => (
          <ChangeRow key={change.id} change={change} />
        ))}
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", textAlign: "center", paddingTop: 4 }}>
          Full audit log available in Governance &amp; Audit
        </div>
      </div>
    </div>
  );
}
