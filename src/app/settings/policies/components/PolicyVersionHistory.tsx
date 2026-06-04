"use client";

import { useState, useEffect } from "react";
import { GitCommit, ChevronDown, ChevronRight } from "lucide-react";
import { fmtDate } from "../data/policyDefaults";

interface VersionEntry {
  id:            number;
  versionNumber: number;
  changeReason:  string;
  createdBy:     string;
  createdAt:     string;
  snapshotJson:  string;
}

interface Props { policyId: number; currentVersion: number; }

export default function PolicyVersionHistory({ policyId, currentVersion }: Props) {
  const [versions, setVersions]     = useState<VersionEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/policies/${policyId}/versions`)
      .then((r) => r.ok ? r.json() : [])
      .then((d: VersionEntry[]) => setVersions(d))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [policyId]);

  if (loading) return <div style={{ fontSize: 12.5, color: "var(--fg-4)", padding: "12px 0" }}>Loading history…</div>;

  if (versions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
        <GitCommit size={20} style={{ color: "var(--fg-4)", marginBottom: 6 }} />
        <div style={{ fontSize: 13, color: "var(--fg-3)" }}>No published versions yet</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 4 }}>Versions are created when a policy is published</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {versions.map((v) => {
        const isCurrent = v.versionNumber === currentVersion;
        const open = expanded === v.id;
        return (
          <div key={v.id} style={{ border: `1px solid ${isCurrent ? "var(--caveo-red)" : "var(--border)"}`, borderRadius: "var(--radius-md)", background: isCurrent ? "rgba(200,16,46,0.03)" : "var(--surface)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer" }}
              onClick={() => setExpanded(open ? null : v.id)}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: isCurrent ? "rgba(200,16,46,0.1)" : "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GitCommit size={13} style={{ color: isCurrent ? "var(--caveo-red)" : "var(--fg-4)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", fontFamily: "var(--font-mono)" }}>v{v.versionNumber}</span>
                  {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--caveo-red)", background: "rgba(200,16,46,0.1)", padding: "1px 6px", borderRadius: 999 }}>CURRENT</span>}
                  <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>{v.changeReason || "No reason provided"}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>Published by {v.createdBy} · {fmtDate(v.createdAt)}</div>
              </div>
              {open ? <ChevronDown size={14} style={{ color: "var(--fg-4)" }} /> : <ChevronRight size={14} style={{ color: "var(--fg-4)" }} />}
            </div>
            {open && (
              <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border-subtle)" }}>
                <pre style={{ fontSize: 11, color: "var(--fg-3)", background: "var(--bg-muted)", padding: 10, borderRadius: "var(--radius-sm)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0, marginTop: 10 }}>
                  {JSON.stringify(JSON.parse(v.snapshotJson), null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
