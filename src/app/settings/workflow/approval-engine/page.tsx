import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isOperationsHead } from "@/lib/roles";
import { deriveCaps } from "./data";
import ApprovalEngineClient from "./ApprovalEngineClient";

export default async function ApprovalEnginePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user      = session.user;
  const isOpsHead = isOperationsHead(user);
  const isManager = !!user.isManager;
  const userName  = user.employeeName ?? user.name ?? "You";

  // Only managers and above can view this configuration page
  if (!isManager && !isOpsHead) redirect("/approvals");

  const caps = deriveCaps({ isManager, isOpsHead, userName });

  return (
    <SheetLayout
      title="Approval Engine"
      description="Configure multi-level approval workflows across Finance, Procurement, HR, Sales and all CRM modules."
    >
      <ApprovalEngineClient caps={caps} />
    </SheetLayout>
  );
}
