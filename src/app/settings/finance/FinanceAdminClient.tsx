"use client";

import { useState } from "react";
import type {
  ExpenseCategoryRecord,
  ExpenseLimitRuleRecord,
  ConveyancePolicyRecord,
  AdvancePolicyRecord,
  CustomerCreditPolicyRecord,
  VoucherConfigRecord,
  CollectionPolicyRecord,
} from "@/lib/finance-engine";
import ExpensePolicyManager from "./components/ExpensePolicyManager";
import ConveyancePolicyManager from "./components/ConveyancePolicyManager";
import AdvancePolicyManager from "./components/AdvancePolicyManager";
import CreditPolicyManager from "./components/CreditPolicyManager";
import VoucherConfigurator from "./components/VoucherConfigurator";
import CollectionRules from "./components/CollectionRules";
import FinanceDashboard from "./components/FinanceDashboard";
import FinanceAudit from "./components/FinanceAudit";

const TABS = [
  { key: "overview",    label: "Overview" },
  { key: "expenses",    label: "Expense Categories" },
  { key: "conveyance",  label: "Conveyance" },
  { key: "advance",     label: "Advance Policy" },
  { key: "credit",      label: "Customer Credit" },
  { key: "voucher",     label: "Voucher Config" },
  { key: "collection",  label: "Collection Rules" },
  { key: "audit",       label: "Audit" },
] as const;
type TabKey = typeof TABS[number]["key"];

interface Props {
  initialCategories:         ExpenseCategoryRecord[];
  initialLimitRules:         ExpenseLimitRuleRecord[];
  initialConveyancePolicies: ConveyancePolicyRecord[];
  initialAdvancePolicies:    AdvancePolicyRecord[];
  initialCreditPolicies:     CustomerCreditPolicyRecord[];
  initialVoucherConfigs:     VoucherConfigRecord[];
  initialCollectionPolicies: CollectionPolicyRecord[];
}

export default function FinanceAdminClient({
  initialCategories,
  initialLimitRules,
  initialConveyancePolicies,
  initialAdvancePolicies,
  initialCreditPolicies,
  initialVoucherConfigs,
  initialCollectionPolicies,
}: Props) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Finance Administration
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Configure expense policies, conveyance rates, advance limits, customer credit, voucher numbering, and collection rules.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding:       "8px 16px",
              fontSize:      13,
              fontWeight:    500,
              whiteSpace:    "nowrap",
              borderRadius:  "6px 6px 0 0",
              border:        tab === t.key ? "1px solid var(--border)" : "none",
              borderBottom:  tab === t.key ? "1px solid var(--card)" : "none",
              marginBottom:  tab === t.key ? -1 : 0,
              background:    tab === t.key ? "var(--card)" : "transparent",
              color:         tab === t.key ? "var(--caveo-red)" : "var(--muted-foreground)",
              cursor:        "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview"   && (
        <FinanceDashboard
          categories={initialCategories}
          conveyancePolicies={initialConveyancePolicies}
          advancePolicies={initialAdvancePolicies}
          creditPolicies={initialCreditPolicies}
          voucherConfigs={initialVoucherConfigs}
          collectionPolicies={initialCollectionPolicies}
        />
      )}
      {tab === "expenses"   && (
        <ExpensePolicyManager
          initialCategories={initialCategories}
          initialLimitRules={initialLimitRules}
        />
      )}
      {tab === "conveyance" && (
        <ConveyancePolicyManager initialPolicies={initialConveyancePolicies} />
      )}
      {tab === "advance"    && (
        <AdvancePolicyManager initialPolicies={initialAdvancePolicies} />
      )}
      {tab === "credit"     && (
        <CreditPolicyManager initialPolicies={initialCreditPolicies} />
      )}
      {tab === "voucher"    && (
        <VoucherConfigurator initialConfigs={initialVoucherConfigs} />
      )}
      {tab === "collection" && (
        <CollectionRules initialPolicies={initialCollectionPolicies} />
      )}
      {tab === "audit" && (
        <FinanceAudit />
      )}
    </div>
  );
}
