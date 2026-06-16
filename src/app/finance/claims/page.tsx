import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isOperationsHead } from "@/lib/roles";
import ClaimsClient from "./ClaimsClient";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export interface ClaimsCaps {
  roleLabel:   string;
  scope:       "all" | "own";
  canManage:   boolean;
  canApprove:  boolean;
  currentUser: string;
  employeeId:  number;
}

export default async function ClaimsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user    = session.user;
  const isFinMgr = canManageFinance(user);
  const isOpsHd  = isOperationsHead(user);
  const isMgr    = !!user.isManager;

  const caps: ClaimsCaps = {
    roleLabel:   isOpsHd ? "Accounts Admin" : isFinMgr ? "Finance Manager" : isMgr ? "Manager" : "Employee",
    scope:       isFinMgr ? "all" : "own",
    canManage:   isFinMgr,
    canApprove:  isMgr || isOpsHd,
    currentUser: user.employeeName ?? user.name ?? "You",
    employeeId:  user.employeeId ?? 0,
  };

  return (
    <SheetLayout
      title="Employee Claims"
      description="View and manage employee expense claims submitted for reimbursement."
    >
      <FinanceModuleStatusBanner
        variant="partially-live"
        message="Claims are connected where APIs are available. Payment and settlement actions may be disabled until Finance write APIs are completed."
      />
      <ClaimsClient caps={caps} />
    </SheetLayout>
  );
}
