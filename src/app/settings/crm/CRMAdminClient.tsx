"use client";

import { useState } from "react";
import type { PipelineWithStages, TerritoryWithRules } from "@/lib/crm-engine";
import type { AccountAssignmentRule, CRMAutomationRule, SLARule } from "@/lib/crm-engine";
import PipelineDesigner from "./components/PipelineDesigner";
import TerritoryManager from "./components/TerritoryManager";
import AssignmentRuleBuilder from "./components/AssignmentRuleBuilder";
import AutomationBuilder from "./components/AutomationBuilder";
import SLAManager from "./components/SLAManager";

const TABS = [
  { key: "pipelines",   label: "Pipelines" },
  { key: "territories", label: "Territories" },
  { key: "assignment",  label: "Assignment Rules" },
  { key: "automation",  label: "Automation" },
  { key: "sla",         label: "SLA Rules" },
] as const;
type TabKey = typeof TABS[number]["key"];

interface Props {
  initialPipelines:      PipelineWithStages[];
  initialTerritories:    TerritoryWithRules[];
  initialAssignmentRules: AccountAssignmentRule[];
  initialAutomationRules: CRMAutomationRule[];
  initialSlaRules:        SLARule[];
}

export default function CRMAdminClient({
  initialPipelines,
  initialTerritories,
  initialAssignmentRules,
  initialAutomationRules,
  initialSlaRules,
}: Props) {
  const [tab, setTab] = useState<TabKey>("pipelines");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM Administration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure pipelines, territories, assignment rules, automations, and SLA policies.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              tab === t.key
                ? "bg-white border border-b-white border-gray-200 text-[var(--caveo-red)] -mb-px"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "pipelines"   && <PipelineDesigner initialData={initialPipelines} />}
        {tab === "territories" && <TerritoryManager initialData={initialTerritories} />}
        {tab === "assignment"  && <AssignmentRuleBuilder initialData={initialAssignmentRules} />}
        {tab === "automation"  && <AutomationBuilder initialData={initialAutomationRules} />}
        {tab === "sla"         && <SLAManager initialData={initialSlaRules} />}
      </div>
    </div>
  );
}
