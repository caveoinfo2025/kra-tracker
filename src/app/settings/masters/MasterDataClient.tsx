"use client";

import { useState } from "react";
import { Database, LayoutList, ToggleLeft, GitMerge, Users, Truck, ShieldCheck, FileSearch } from "lucide-react";
import MasterDashboard    from "./components/MasterDashboard";
import MasterCategoryList from "./components/MasterCategoryList";
import MasterValueManager from "./components/MasterValueManager";
import OverrideManager    from "./components/OverrideManager";
import CustomerGovernance from "./components/CustomerGovernance";
import VendorGovernance   from "./components/VendorGovernance";
import ValidationRules    from "./components/ValidationRules";
import MasterAudit        from "./components/MasterAudit";

type Tab =
  | "overview"
  | "categories"
  | "values"
  | "overrides"
  | "customers"
  | "vendors"
  | "validation"
  | "audit";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Overview",        icon: Database     },
  { id: "categories", label: "Categories",       icon: LayoutList   },
  { id: "values",     label: "Values",           icon: ToggleLeft   },
  { id: "overrides",  label: "Overrides",        icon: GitMerge     },
  { id: "customers",  label: "Customer Policy",  icon: Users        },
  { id: "vendors",    label: "Vendor Policy",    icon: Truck        },
  { id: "validation", label: "Validation Rules", icon: ShieldCheck  },
  { id: "audit",      label: "Audit Log",        icon: FileSearch   },
];

interface Props {
  canEdit:       boolean;
  currentUserId: number;
}

export default function MasterDataClient({ canEdit, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          Master Data Management
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Configure global masters, overrides, validation rules and governance policies.
        </p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: 28,
          overflowX: "auto",
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            6,
                padding:        "8px 14px",
                fontSize:       13,
                fontWeight:     active ? 600 : 400,
                color:          active ? "var(--primary)" : "var(--muted-foreground)",
                background:     "transparent",
                border:         "none",
                borderBottom:   active ? "2px solid var(--primary)" : "2px solid transparent",
                cursor:         "pointer",
                whiteSpace:     "nowrap",
                transition:     "color 0.15s",
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {tab === "overview"   && <MasterDashboard    canEdit={canEdit} />}
      {tab === "categories" && <MasterCategoryList canEdit={canEdit} currentUserId={currentUserId} />}
      {tab === "values"     && <MasterValueManager canEdit={canEdit} currentUserId={currentUserId} />}
      {tab === "overrides"  && <OverrideManager    canEdit={canEdit} currentUserId={currentUserId} />}
      {tab === "customers"  && <CustomerGovernance canEdit={canEdit} currentUserId={currentUserId} />}
      {tab === "vendors"    && <VendorGovernance   canEdit={canEdit} currentUserId={currentUserId} />}
      {tab === "validation" && <ValidationRules    canEdit={canEdit} currentUserId={currentUserId} />}
      {tab === "audit"      && <MasterAudit />}
    </div>
  );
}
