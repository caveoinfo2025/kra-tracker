import { redirect } from "next/navigation";
import { getSession }    from "@/lib/dev-session";
import { hasPermission } from "@/lib/access-control";
import { isOperationsHead, hasManagerReach } from "@/lib/roles";
import SheetLayout       from "@/components/SheetLayout";
import WorkflowCenter    from "../WorkflowCenter";

export default async function ApprovalEnginePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user      = session.user;
  const userId    = user.employeeId!;
  const isOpsHead = isOperationsHead(user);
  const isManager = !!user.isManager || hasManagerReach(user);
  const userName  = user.employeeName ?? user.name ?? "You";

  // DB-driven permission check; falls back to role predicate when DB tables are empty
  const [canView, canEdit] = await Promise.all([
    hasPermission(userId, "Settings", "Workflow", "VIEW"),
    hasPermission(userId, "Settings", "Workflow", "EDIT"),
  ]);

  // Fallback to legacy predicate while the permission table is being populated
  const effectiveView = canView || isManager || isOpsHead;
  const effectiveEdit = canEdit || isOpsHead;

  if (!effectiveView) redirect("/approvals");

  return (
    <SheetLayout
      title="Approval Engine"
      description="Configure multi-level approval workflows across Finance, Procurement, HR, Sales and all CRM modules."
    >
      <WorkflowCenter
        canEdit={effectiveEdit}
        engineCaps={{ isManager, isOpsHead, currentUser: userName }}
      />
    </SheetLayout>
  );
}
