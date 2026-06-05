"use client";

import { useEffect, useState } from "react";
import { Database, Tags, ToggleLeft, GitMerge, ShieldCheck } from "lucide-react";

interface Stats {
  categories:  number;
  definitions: number;
  values:      number;
  overrides:   number;
}

interface Props { canEdit: boolean }

export default function MasterDashboard({ canEdit }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/masters");
        if (res.ok) {
          const json = await res.json() as { categories?: number; definitions?: number; values?: number; overrides?: number };
          setStats({
            categories:  json.categories  ?? 0,
            definitions: json.definitions ?? 0,
            values:      json.values      ?? 0,
            overrides:   json.overrides   ?? 0,
          });
        }
      } catch { /* pre-migration */ }
    }
    void load();
  }, []);

  const cards = [
    { label: "Categories",   value: stats?.categories  ?? "—", icon: Tags,       color: "#0066FF" },
    { label: "Definitions",  value: stats?.definitions ?? "—", icon: Database,   color: "#1F9D55" },
    { label: "Values",       value: stats?.values      ?? "—", icon: ToggleLeft, color: "#FF6B00" },
    { label: "Overrides",    value: stats?.overrides   ?? "—", icon: GitMerge,   color: "#C8102E" },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16, marginBottom: 32 }}>
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            style={{
              background:   "var(--card)",
              border:       "1px solid var(--border)",
              borderRadius: 10,
              padding:      "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: `${color}18`, borderRadius: 7, padding: 7 }}>
                <Icon size={16} color={color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div
        style={{
          background:   "var(--card)",
          border:       "1px solid var(--border)",
          borderRadius: 10,
          padding:      "22px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ShieldCheck size={16} color="#1F9D55" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Three-Layer Override Architecture</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
          Master values are resolved in layers: <strong>Global</strong> values are defined centrally,
          then <strong>Company</strong> overrides rename or disable values for a specific company,
          and <strong>Branch</strong> overrides apply the finest level of customisation.
          The branch override always takes precedence over the company override,
          which takes precedence over the global value.
        </p>
        {!canEdit && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>
            You have read-only access to master data. Contact your administrator to request edit permissions.
          </p>
        )}
      </div>
    </div>
  );
}
