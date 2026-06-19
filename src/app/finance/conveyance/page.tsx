import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import ConveyanceClient from "./ConveyanceClient";
import { deriveCaps } from "./data";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export default async function ConveyancePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const caps = deriveCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });

  const currentEmployee = user.employeeName ?? user.name ?? "You";
  const currentGrade    = (user as { grade?: string }).grade ?? "Engineer";

  return (
    <SheetLayout
      title="Local Conveyance"
      description="Log daily travel trips for mileage-based reimbursement at HR Policy rates."
    >
      <FinanceModuleStatusBanner
        variant="partially-live"
        message="Trip register reads live data. Logging trips, approvals, monthly settlement, and policy config remain mock pending further backend work."
      />
      <ConveyanceClient
        caps={caps}
        currentEmployee={currentEmployee}
        currentGrade={currentGrade}
      />
    </SheetLayout>
  );
}
