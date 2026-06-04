import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";
import FinanceDashboardClient from "./FinanceDashboardClient";

export default async function FinanceDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // Finance roles see the hub dashboard; regular employees go to their own expenses
  if (!canManageFinance(session.user)) redirect("/finance/expenses");

  // ── Phase 2: mock data ──────────────────────────────────────────────────────
  // Finance APIs are not built yet (Phase 5+). The dashboard renders from the
  // illustrative dataset defined inside FinanceDashboardClient. When the finance
  // service endpoints land, fetch here and pass real props in the same shape.
  return (
    <FinanceDashboardClient
      employeeName={session.user.employeeName ?? session.user.name ?? "there"}
    />
  );
}
