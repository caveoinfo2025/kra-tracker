import { Settings2 } from "lucide-react";

interface AdminHeaderProps {
  moduleCount: number;
}

export default function AdminHeader({ moduleCount }: AdminHeaderProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Settings2 size={13} strokeWidth={1.8} style={{ color: "var(--fg-4)" }} />
        <span style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 500 }}>Administration Console</span>
      </div>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--fg-1)",
            fontFamily: "var(--font-display)",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}>
            Administration Console
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 6, lineHeight: 1.5 }}>
            Configure organization policies, security, workflows and CRM operations
          </p>
        </div>

        {/* Module count pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-pill)",
          padding: "5px 12px",
          flexShrink: 0,
        }}>
          <div style={{
            width: 7, height: 7,
            borderRadius: "50%",
            background: "var(--success)",
          }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)" }}>
            {moduleCount} Modules
          </span>
        </div>
      </div>
    </div>
  );
}
