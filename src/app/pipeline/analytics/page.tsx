import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // Both managers and employees can see analytics (scoped by RBAC in API)

  return (
    <SheetLayout
      title="Pipeline Analytics"
      description="Lead qualification metrics, funnel performance, and revenue forecasting."
    >
      <AnalyticsClient isManager={!!session.user.isManager} />
    </SheetLayout>
  );
}
