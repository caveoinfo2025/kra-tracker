"use client";

type Props = {
  periods: unknown[];
  metrics: unknown[];
  templates: unknown[];
  employeeTargets: unknown[];
};

export default function PerformanceDashboard({ periods, metrics, templates, employeeTargets }: Props) {
  const stats = [
    { label: "Performance Periods", value: periods.length, color: "#6366f1" },
    { label: "KRA Metrics", value: metrics.length, color: "#0ea5e9" },
    { label: "KRA Templates", value: templates.length, color: "#22c55e" },
    { label: "Employee Targets", value: employeeTargets.length, color: "var(--caveo-red)" },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 20,
              borderLeft: `4px solid ${stat.color}`,
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Empty state notice when no data */}
      {periods.length === 0 && (
        <div
          style={{
            background: "#fef9c3",
            border: "1px solid #fde047",
            borderRadius: 8,
            padding: 16,
            color: "#713f12",
            fontSize: 14,
          }}
        >
          <strong>Getting started:</strong> Create a Performance Period first, then define KRA Metrics
          and build KRA Templates to assign targets to employees.
        </div>
      )}
    </div>
  );
}
