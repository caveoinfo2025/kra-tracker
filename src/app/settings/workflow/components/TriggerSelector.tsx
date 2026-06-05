"use client";

interface Props {
  module:       string;
  triggerEvent: string;
  onChange:     (field: "module" | "triggerEvent", value: string) => void;
  disabled?:    boolean;
}

interface TriggerDef {
  value: string;
  label: string;
}

const MODULE_TRIGGERS: Record<string, TriggerDef[]> = {
  FINANCE: [
    { value: "EXPENSE_SUBMITTED",   label: "Expense Submitted"   },
    { value: "ADVANCE_REQUESTED",   label: "Advance Requested"   },
    { value: "PAYMENT_APPROVED",    label: "Payment Approved"    },
    { value: "VOUCHER_CREATED",     label: "Voucher Created"     },
  ],
  CRM: [
    { value: "OPPORTUNITY_LARGE_DEAL",       label: "Large Deal Opportunity"  },
    { value: "DISCOUNT_REQUESTED",           label: "Discount Requested"      },
    { value: "CONTRACT_SUBMITTED",           label: "Contract Submitted"      },
    { value: "CUSTOMER_CREATION_REQUESTED",  label: "Customer Creation"       },
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
    { value: "USER_ACCESS_CHANGE", label: "User Access Change" },
    { value: "POLICY_CHANGE",      label: "Policy Change"      },
    { value: "CONFIG_CHANGE",      label: "Configuration Change" },
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

const MODULES = Object.keys(MODULE_TRIGGERS);

export default function TriggerSelector({ module, triggerEvent, onChange, disabled }: Props) {
  const triggers = MODULE_TRIGGERS[module] ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <label className="form-label">Module *</label>
        <select
          className="input"
          value={module}
          disabled={disabled}
          onChange={(e) => { onChange("module", e.target.value); onChange("triggerEvent", ""); }}
        >
          <option value="">Select module…</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>
          ))}
        </select>
        <p className="form-hint">The business area this workflow applies to</p>
      </div>

      <div>
        <label className="form-label">Trigger Event *</label>
        <select
          className="input"
          value={triggerEvent}
          disabled={disabled || !module}
          onChange={(e) => onChange("triggerEvent", e.target.value)}
        >
          <option value="">Select event…</option>
          {triggers.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <p className="form-hint">The business event that starts this approval workflow</p>
      </div>
    </div>
  );
}
