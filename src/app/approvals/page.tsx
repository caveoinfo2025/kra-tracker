import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isOperationsHead } from "@/lib/roles";
import { deriveCaps } from "../settings/workflow/approval-engine/data";
import ApprovalInboxPage from "./ApprovalInboxPage";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user       = session.user;
  const isOpsHead  = isOperationsHead(user);
  const isManager  = !!user.isManager;
  const userName   = user.employeeName ?? user.name ?? "You";
  const employeeId = user.employeeId ?? 0;

  const caps = deriveCaps({ isManager, isOpsHead, userName });

  return (
    <SheetLayout
      title="My Approvals"
      description="Review and act on approval requests assigned to you across all modules."
    >
      <ApprovalInboxPage caps={caps} employeeId={employeeId} />
    </SheetLayout>
  );
}
