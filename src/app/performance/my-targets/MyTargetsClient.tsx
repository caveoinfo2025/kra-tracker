"use client";

/**
 * Phase W8.4 — read-only presentation of assigned KRA targets.
 * No edit controls, no achievement/scoring, no raw JSON, no raw employee IDs.
 */

type Kpi = {
  kpiName: string;
  category: string;
  source: string;
  unit: string;
  targetValue: number;
  weight: number;
  frequency: string;
  isActive: boolean;
  notes: string;
};

type TargetGroup = {
  period: string;
  templateName: string;
  status: string;
  updatedAt: string | null;
  kpis: Kpi[];
};

type EmployeeTargets = {
  employeeProfileId: number;
  employeeName: string;
  designation: string;
  department: string;
  team: string;
  reportingManager: string;
  targets: TargetGroup[];
};

type MineShape = {
  employeeName?: string;
  designation?: string;
  department?: string;
  team?: string;
  reportingManager?: string;
  targets?: TargetGroup[];
} | null;

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

function statusChip(status: string) {
  const active = status === "active";
  return (
    <span style={{ fontSize: 12, background: active ? "#dcfce7" : "#f3f4f6", color: active ? "#15803d" : "#6b7280", borderRadius: 4, padding: "2px 8px" }}>
      {status}
    </span>
  );
}

function KpiTable({ kpis }: { kpis: Kpi[] }) {
  if (kpis.length === 0) {
    return <div style={{ color: "#9ca3af", fontSize: 13, padding: "8px 2px" }}>No KPI targets set for this period yet.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>KPI</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Category</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Source</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Unit</th>
            <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Target</th>
            <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Weight %</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Frequency</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((k, i) => (
            <tr key={`${k.kpiName}-${i}`} style={{ borderBottom: "1px solid #f3f4f6", opacity: k.isActive ? 1 : 0.55 }}>
              <td style={{ padding: "8px 10px", fontWeight: 500 }}>
                {k.kpiName}
                {k.notes ? <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>{k.notes}</div> : null}
              </td>
              <td style={{ padding: "8px 10px", color: "#6b7280" }}>{k.category || "—"}</td>
              <td style={{ padding: "8px 10px", color: "#6b7280" }}>{k.source || "—"}</td>
              <td style={{ padding: "8px 10px", color: "#6b7280" }}>{k.unit || "—"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{k.targetValue}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{k.weight}</td>
              <td style={{ padding: "8px 10px", color: "#6b7280" }}>{k.frequency || "—"}</td>
              <td style={{ padding: "8px 10px" }}>
                <span style={{ fontSize: 12, background: k.isActive ? "#dcfce7" : "#f3f4f6", color: k.isActive ? "#15803d" : "#6b7280", borderRadius: 4, padding: "2px 8px" }}>
                  {k.isActive ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TargetGroupBlock({ t }: { t: TargetGroup }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{t.period}</strong>
        {statusChip(t.status)}
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {t.templateName ? <>Template: {t.templateName}</> : <>Custom (no template)</>}
        </span>
        {t.updatedAt && (
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
            Updated {new Date(t.updatedAt).toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <KpiTable kpis={t.kpis} />
    </div>
  );
}

export default function MyTargetsClient({
  mine,
  team,
  isManager,
  fallbackName,
}: {
  mine: MineShape;
  team: EmployeeTargets[];
  isManager: boolean;
  fallbackName: string;
}) {
  const myName = mine?.employeeName || fallbackName;
  const myTargets = mine?.targets ?? [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--caveo-red)" }}>My KRA Targets</h1>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Your assigned Key Result Area targets. This view is read-only — targets are set by your manager.
        </p>
      </div>

      {/* My own targets */}
      <div style={card}>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          <strong style={{ color: "#111827", fontSize: 15 }}>{myName}</strong>
          {mine?.designation ? <> · {mine.designation}</> : null}
          {mine?.department ? <> · {mine.department}</> : null}
          {mine?.reportingManager ? <> · Reports to {mine.reportingManager}</> : null}
        </div>
        {myTargets.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, padding: "16px 2px" }}>
            You have no KRA targets assigned yet. Your manager will assign them for the review period.
          </div>
        ) : (
          myTargets.map((t, i) => <TargetGroupBlock key={i} t={t} />)
        )}
      </div>

      {/* Manager: read-only team targets */}
      {isManager && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>My Team&apos;s KRA Targets</h2>
          <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 13 }}>
            Read-only view of assigned targets for your direct reports. To assign or edit targets, use
            Settings → Performance → Employee Targets.
          </p>
          {team.length === 0 ? (
            <div style={{ ...card, color: "#9ca3af", fontSize: 14 }}>
              No direct reports have KRA targets assigned yet.
            </div>
          ) : (
            team.map((emp) => (
              <div key={emp.employeeProfileId} style={card}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                  <strong style={{ color: "#111827", fontSize: 15 }}>{emp.employeeName}</strong>
                  {emp.designation ? <> · {emp.designation}</> : null}
                  {emp.department ? <> · {emp.department}</> : null}
                </div>
                {emp.targets.length === 0 ? (
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>No targets assigned.</div>
                ) : (
                  emp.targets.map((t, i) => <TargetGroupBlock key={i} t={t} />)
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
