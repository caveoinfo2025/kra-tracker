import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isOperationsHead } from "@/lib/roles";
import { deriveCaps, MOCK_REQUESTS } from "@/app/settings/workflow/approval-engine/data";
import FinanceApprovalsClient from "./FinanceApprovalsClient";

export default async function FinanceApprovalsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/finance");

  const user      = session.user;
  const isOpsHead = isOperationsHead(user);
  const isManager = !!user.isManager;
  const userName  = user.employeeName ?? user.name ?? "You";

  const caps = deriveCaps({ isManager, isOpsHead, userName });

  const financeRequests = MOCK_REQUESTS.filter((r) => r.module === "Finance");

  return (
    <SheetLayout
      title="Finance Approvals"
      description="Approve or reject expense claims, advances, conveyance claims, and payment requests."
    >
      <FinanceApprovalsClient caps={caps} requests={financeRequests} />
    </SheetLayout>
  );
}
