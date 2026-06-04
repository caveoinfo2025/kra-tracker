import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import ConveyanceClient from "./ConveyanceClient";
import { deriveCaps } from "./data";

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
      <ConveyanceClient
        caps={caps}
        currentEmployee={currentEmployee}
        currentGrade={currentGrade}
      />
    </SheetLayout>
  );
}
