import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";
import FinanceDashboardClient from "./FinanceDashboardClient";

export default async function FinanceDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // Finance roles see the hub dashboard; regular employees go to their own expenses
  if (!canManageFinance(session.user)) redirect("/finance/expenses");

  // ── Step 2H: live data ─────────────────────────────────────────────────────
  // Dashboard is wired to GET /api/finance/dashboard. The client component
  // owns the fetch, period filter, loading/error states, and feature-gating.
  return (
    <FinanceDashboardClient
      employeeName={session.user.employeeName ?? session.user.name ?? "there"}
    />
  );
}
