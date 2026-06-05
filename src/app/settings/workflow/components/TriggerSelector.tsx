"use client";

interface Props {
  module:       string;
  triggerEvent: string;
  onChange:     (field: "module" | "triggerEvent", value: string) => void;
  disabled?:    boolean;
}

const MODULE_TRIGGERS: Record<string, Array<{ value: string; label: string }>> = {
  FINANCE: [
    { value: "EXPENSE_SUBMITTED", label: "Expense Submitted"    },
    { value: "ADVANCE_REQUESTED", label: "Advance Requested"    },
    { value: "PAYMENT_APPROVED",  label: "Payment Approved"     },
    { value: "VOUCHER_CREATED",   label: "Voucher Created"      },
  ],
  CRM: [
    { value: "OPPORTUNITY_LARGE_DEAL",       label: "Large Deal Opportunity" },
    { value: "DISCOUNT_REQUESTED",           label: "Discount Requested"     },
    { value: "CONTRACT_SUBMITTED",           label: "Contract Submitted"     },
    { value: "CUSTOMER_CREATION_REQUESTED",  label: "Customer Creation"      },
  ],
  MASTERS: [
    { value: "CUSTOMER_CREATION_REQUESTED", label: "Customer Creation" },
    { value: "VENDOR_CREATION_REQUESTED",   label: "Vendor Creation"   },
  ],
  HR: [
    { value: "LEAVE_APPLIED",   label: "Leave Application" },
    { value: "SALARY_REVISION", label: "Salary Revision"   },
    { value: "ASSET_REQUESTED", label: "Asset Request"     },
  ],
  PROCUREMENT: [
    { value: "PURCHASE_REQUESTED", label: "Purchase Request"  },
    { value: "VENDOR_ONBOARDING",  label: "Vendor Onboarding" },
  ],
  ADMIN: [
    { value: "USER_ACCESS_CHANGE", label: "User Access Change"    },
    { value: "POLICY_CHANGE",      label: "Policy Change"         },
    { value: "CONFIG_CHANGE",      label: "Configuration Change"  },
  ],
};

const MODULE_LABELS: Record<string, string> = {
  FINANCE:     "Finance",
  CRM:         "CRM / Sales",
  MASTERS:     "Master Data",
  HR:          "HR",
  PROCUREMENT: "Procurement",
  ADMIN:       "Administration",
};

export default function TriggerSelector({ module, triggerEvent, onChange, disabled }: Props) {
  const triggers = MODULE_TRIGGERS[module] ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <div style={lbl}>Module *</div>
        <select
          style={disabled ? disabledSel : activeSel}
          value={module}
          disabled={disabled}
          onChange={(e) => { onChange("module", e.target.value); onChange("triggerEvent", ""); }}
        >
          <option value="">Select module...</option>
          {Object.keys(MODULE_TRIGGERS).map((m) => (
            <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>
          ))}
        </select>
        <div style={hnt}>The business area this workflow applies to</div>
      </div>

      <div>
        <div style={lbl}>Trigger Event *</div>
        <select
          style={disabled || !module ? disabledSel : activeSel}
          value={triggerEvent}
          disabled={disabled || !module}
          onChange={(e) => onChange("triggerEvent", e.target.value)}
        >
          <option value="">Select event...</option>
          {triggers.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div style={hnt}>The event that starts this approval workflow</div>
      </div>
    </div>
  );
}

const base: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box",
  padding: "9px 12px", fontSize: 13, borderRadius: 7,
  border: "1px solid var(--border)",
};
const activeSel:   React.CSSProperties = { ...base, background: "var(--bg-elev)", color: "var(--fg-1)" };
const disabledSel: React.CSSProperties = { ...base, background: "var(--bg-muted)", color: "var(--fg-3)", cursor: "not-allowed" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 };
const hnt: React.CSSProperties = { fontSize: 11, color: "var(--fg-4)", marginTop: 4 };
