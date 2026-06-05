// Phase 8: CRM Administration Engine
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { listPipelines, listTerritories, listAssignmentRules, listAutomationRules, listSLARules } from "@/lib/crm-engine";
import CRMAdminClient from "./CRMAdminClient";

export default async function CRMAdminPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isManager) redirect("/dashboard");

  const [pipelines, territories, assignmentRules, automationRules, slaRules] = await Promise.all([
    listPipelines(),
    listTerritories(),
    listAssignmentRules(),
    listAutomationRules(),
    listSLARules(),
  ]);

  return (
    <CRMAdminClient
      initialPipelines={pipelines}
      initialTerritories={territories}
      initialAssignmentRules={assignmentRules}
      initialAutomationRules={automationRules}
      initialSlaRules={slaRules}
    />
  );
}
