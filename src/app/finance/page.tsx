import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";
import FinanceDashboardClient from "./FinanceDashboardClient";
import FinanceModuleStatusBanner from "./_shared/FinanceModuleStatusBanner";

export default async function FinanceDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // Finance roles see the hub dashboard; regular employees go to their own expenses
  if (!canManageFinance(session.user)) redirect("/finance/expenses");

  return (
    <>
      <FinanceModuleStatusBanner
        variant="live-readonly"
        message="Dashboard reads live Finance data. Quick actions will be enabled after write APIs are implemented."
      />
      <FinanceDashboardClient
        employeeName={session.user.employeeName ?? session.user.name ?? "there"}
      />
    </>
  );
}
