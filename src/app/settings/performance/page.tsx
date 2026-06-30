import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import {
  listPerformancePeriods,
  listKRAMetrics,
  listKRATemplates,
  listEmployeeTargets,
  listTeamTargets,
  listDailyActivityKraMetrics,
} from "@/lib/performance-engine";
import PerformanceAdminClient from "./PerformanceAdminClient";

export default async function PerformanceAdminPage() {
  const session = await getSession();
  if (!session?.user?.isManager) redirect("/dashboard");

  const [periods, metrics, templates, employeeTargets, teamTargets, dailyActivityMetrics] =
    await Promise.all([
      listPerformancePeriods(),
      listKRAMetrics(),
      listKRATemplates(),
      listEmployeeTargets(),
      listTeamTargets(),
      listDailyActivityKraMetrics(),
    ]);

  return (
    <PerformanceAdminClient
      initialPeriods={JSON.parse(JSON.stringify(periods))}
      initialMetrics={JSON.parse(JSON.stringify(metrics))}
      initialTemplates={JSON.parse(JSON.stringify(templates))}
      initialEmployeeTargets={JSON.parse(JSON.stringify(employeeTargets))}
      initialTeamTargets={JSON.parse(JSON.stringify(teamTargets))}
      initialDailyActivityMetrics={JSON.parse(JSON.stringify(dailyActivityMetrics))}
    />
  );
}
