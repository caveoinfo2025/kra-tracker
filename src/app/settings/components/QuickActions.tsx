import Link from "next/link";
import { UserPlus, ClipboardCheck, FileSearch, Download } from "lucide-react";

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  available: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Invite User",
    description: "Add a new employee",
    href: "/employees",
    icon: UserPlus,
    available: true,
  },
  {
    label: "Review Approvals",
    description: "Pending requests",
    href: "/approvals",
    icon: ClipboardCheck,
    available: true,
  },
  {
    label: "Audit Log",
    description: "View config history",
    href: "/settings/governance",
    icon: FileSearch,
    available: false,
  },
  {
    label: "Export Config",
    description: "Download settings",
    href: "#",
    icon: Download,
    available: false,
  },
];

export default function QuickActions() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header">
        <div>
          <div className="ch-title">Quick Actions</div>
          <div className="ch-sub">Common admin tasks</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const content = (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: "var(--radius-md)",
              background: action.available ? "transparent" : "var(--bg-muted)",
              border: "1px solid var(--border)",
              cursor: action.available ? "pointer" : "not-allowed",
              opacity: action.available ? 1 : 0.55,
              transition: "background var(--duration-fast), border-color var(--duration-fast)",
            }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-sm)",
                background: action.available ? "rgba(200,16,46,0.08)" : "var(--bg-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon
                  size={14}
                  strokeWidth={1.8}
                  style={{ color: action.available ? "var(--caveo-red)" : "var(--fg-4)" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: action.available ? "var(--fg-1)" : "var(--fg-3)" }}>
                  {action.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{action.description}</div>
              </div>
              {!action.available && (
                <span className="badge badge-neutral" style={{ fontSize: 9.5 }}>Soon</span>
              )}
            </div>
          );

          return action.available ? (
            <Link key={action.label} href={action.href} style={{ textDecoration: "none" }}>
              {content}
            </Link>
          ) : (
            <div key={action.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
