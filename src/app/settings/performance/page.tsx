import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import {
  listPerformancePeriods,
  listKRAMetrics,
  listKRATemplates,
  listEmployeeTargets,
  listTeamTargets,
  listDailyActivityKraMetrics,
  listEmployeeProfilesForTargeting,
  parseDailyActivityMetricConfig,
} from "@/lib/performance-engine";
import PerformanceAdminClient from "./PerformanceAdminClient";

export default async function PerformanceAdminPage() {
  const session = await getSession();
  if (!session?.user?.isManager) redirect("/dashboard");

  const [periods, metrics, templates, employeeTargets, teamTargets, dailyActivityMetrics, employeeProfiles] =
    await Promise.all([
      listPerformancePeriods(),
      listKRAMetrics(),
      listKRATemplates(),
      listEmployeeTargets(),
      listTeamTargets(),
      listDailyActivityKraMetrics(),
      listEmployeeProfilesForTargeting(),
    ]);

  // Surface the parsed business config (no raw JSON) to the Daily Activity KRA UI.
  const dailyActivityMetricsForUi = (dailyActivityMetrics as { formulaJson?: string }[]).map((m) => ({
    ...m,
    config: parseDailyActivityMetricConfig(m),
  }));

  return (
    <PerformanceAdminClient
      initialPeriods={JSON.parse(JSON.stringify(periods))}
      initialMetrics={JSON.parse(JSON.stringify(metrics))}
      initialTemplates={JSON.parse(JSON.stringify(templates))}
      initialEmployeeTargets={JSON.parse(JSON.stringify(employeeTargets))}
      initialTeamTargets={JSON.parse(JSON.stringify(teamTargets))}
      initialDailyActivityMetrics={JSON.parse(JSON.stringify(dailyActivityMetricsForUi))}
      initialEmployeeProfiles={JSON.parse(JSON.stringify(employeeProfiles))}
    />
  );
}
