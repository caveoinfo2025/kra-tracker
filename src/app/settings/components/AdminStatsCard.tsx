import type { AdminStat } from "../data/adminModules";

interface AdminStatsCardProps {
  stat: AdminStat;
}

export default function AdminStatsCard({ stat }: AdminStatsCardProps) {
  return (
    <div
      className="kpi"
      style={{ borderLeft: `3px solid ${stat.accentColor}` }}
    >
      <div className="kpi-label">{stat.label}</div>
      <div className="kpi-value" style={{ fontSize: 26 }}>
        {stat.value}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 500 }}>
        {stat.sub}
      </div>
    </div>
  );
}
