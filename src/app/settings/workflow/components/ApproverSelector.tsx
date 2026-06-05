"use client";

interface Props {
  approvalType:    string;
  approverId?:     number | null;
  approverRoleId?: number | null;
  onChange:        (field: string, value: string | number | null) => void;
  disabled?:       boolean;
}

const APPROVAL_TYPES = [
  { value: "REPORTING_MANAGER", label: "Reporting Manager",  hint: "The requestor's direct manager" },
  { value: "DEPARTMENT_HEAD",   label: "Department Head",    hint: "Head of the requestor's department" },
  { value: "ROLE",              label: "Role",               hint: "All employees with a specific role" },
  { value: "USER",              label: "Specific User",      hint: "A designated employee" },
  { value: "POLICY_BASED",      label: "Policy-Based",       hint: "Resolved by the Policy Engine at runtime" },
];

export default function ApproverSelector({ approvalType, approverId, approverRoleId, onChange, disabled }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label className="form-label">Approver Type *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {APPROVAL_TYPES.map((t) => (
            <label
              key={t.value}
              style={{
                display:       "flex",
                alignItems:    "flex-start",
                gap:           10,
                padding:       "10px 12px",
                borderRadius:  6,
                border:        `1px solid ${approvalType === t.value ? "var(--caveo-red)" : "var(--border)"}`,
                background:    approvalType === t.value ? "rgba(200,16,46,0.05)" : "var(--bg-card)",
                cursor:        disabled ? "not-allowed" : "pointer",
                opacity:       disabled ? 0.6 : 1,
              }}
            >
              <input
                type="radio"
                name="approvalType"
                value={t.value}
                checked={approvalType === t.value}
                disabled={disabled}
                onChange={() => onChange("approvalType", t.value)}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{t.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {approvalType === "USER" && (
        <div>
          <label className="form-label">Employee ID *</label>
          <input
            className="input"
            type="number"
            placeholder="Enter employee ID"
            value={approverId ?? ""}
            disabled={disabled}
            onChange={(e) => onChange("approverId", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      )}

      {approvalType === "ROLE" && (
        <div>
          <label className="form-label">Role ID *</label>
          <input
            className="input"
            type="number"
            placeholder="Enter role ID"
            value={approverRoleId ?? ""}
            disabled={disabled}
            onChange={(e) => onChange("approverRoleId", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      )}

      {approvalType === "POLICY_BASED" && (
        <div style={{ padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 6, fontSize: 13, color: "var(--fg-4)" }}>
          The Policy Engine will evaluate active rules to determine the approver at the time the request is submitted.
        </div>
      )}
    </div>
  );
}
