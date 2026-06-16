import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isOperationsHead } from "@/lib/roles";
import AdvancesClient from "./AdvancesClient";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export interface AdvanceCaps {
  roleLabel:    string;
  scope:        "all" | "own";
  canManage:    boolean;  // canManageFinance — sees all records, can disburse/settle
  canApprove:   boolean;  // isManager or isOpsHead
  currentUser:  string;
  employeeId:   number;
}

export default async function AdvancesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user     = session.user;
  const isFinMgr = canManageFinance(user);
  const isOpsHd  = isOperationsHead(user);
  const isMgr    = !!user.isManager;

  const caps: AdvanceCaps = {
    roleLabel:   isOpsHd  ? "Accounts Admin"  : isFinMgr ? "Finance Manager" : isMgr ? "Manager" : "Employee",
    scope:       isFinMgr ? "all"             : "own",
    canManage:   isFinMgr,
    canApprove:  isMgr || isOpsHd,
    currentUser: user.employeeName ?? user.name ?? "You",
    employeeId:  user.employeeId   ?? 0,
  };

  return (
    <SheetLayout
      title="Employee Advances"
      description="Request and track cash advances before expenses are incurred."
    >
      <FinanceModuleStatusBanner
        variant="partially-live"
        message="Advance records are connected where APIs are available. Payment and settlement actions may be disabled until backend workflows are completed."
      />
      <AdvancesClient caps={caps} />
    </SheetLayout>
  );
}
