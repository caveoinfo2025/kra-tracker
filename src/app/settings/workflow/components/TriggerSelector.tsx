"use client";

interface Props {
  module:      string;
  triggerEvent: string;
  onChange:    (field: "module" | "triggerEvent", value: string) => void;
  disabled?:   boolean;
}

const MODULE_TRIGGERS: Record<string, string[]> = {
  FINANCE:    ["EXPENSE_SUBMITTED", "ADVANCE_REQUESTED", "PAYMENT_APPROVED", "VOUCHER_CREATED"],
  CRM:        ["OPPORTUNITY_LARGE_DEAL", "DISCOUNT_REQUESTED", "CONTRACT_SUBMITTED", "CUSTOMER_CREATION_REQUESTED"],
  MASTERS:    ["CUSTOMER_CREATION_REQUESTED", "VENDOR_CREATION_REQUESTED"],
  HR:         ["LEAVE_APPLIED", "SALARY_REVISION", "ASSET_REQUESTED"],
  PROCUREMENT:["PURCHASE_REQUESTED", "VENDOR_ONBOARDING"],
  ADMIN:      ["USER_ACCESS_CHANGE", "POLICY_CHANGE", "CONFIG_CHANGE"],
};

const MODULES = Object.keys(MODULE_TRIGGERS);

export default function TriggerSelector({ module, triggerEvent, onChange, disabled }: Props) {
  const triggers = MODULE_TRIGGERS[module] ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label className="form-label">Module *</label>
        <select
          className="input"
          value={module}
          disabled={disabled}
          onChange={(e) => onChange("module", e.target.value)}
        >
          <option value="">Select module…</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>The business module this workflow applies to</div>
      </div>

      <div>
        <label className="form-label">Trigger Event *</label>
        <select
          className="input"
          value={triggerEvent}
          disabled={disabled || !module}
          onChange={(e) => onChange("triggerEvent", e.target.value)}
        >
          <option value="">Select trigger…</option>
          {triggers.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>The event that starts this approval workflow</div>
      </div>
    </div>
  );
}
