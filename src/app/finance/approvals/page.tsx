import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isOperationsHead } from "@/lib/roles";
import { deriveCaps } from "@/app/settings/workflow/approval-engine/data";
import FinanceApprovalsClient from "./FinanceApprovalsClient";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export default async function FinanceApprovalsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/finance");

  const user      = session.user;
  const isOpsHead = isOperationsHead(user);
  const isManager = !!user.isManager;
  const userName  = user.employeeName ?? user.name ?? "You";

  const caps = deriveCaps({ isManager, isOpsHead, userName });

  return (
    <SheetLayout
      title="Finance Approvals"
      description="Approve or reject expense claims, advances, conveyance claims, and payment requests."
    >
      <FinanceModuleStatusBanner
        variant="live-operational"
        message="Finance approvals are wired to the live Approval Engine."
      />
      <FinanceApprovalsClient caps={caps} />
    </SheetLayout>
  );
}
