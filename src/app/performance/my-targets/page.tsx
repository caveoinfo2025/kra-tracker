import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import {
  getMyAssignedKraTargets,
  getManagerTeamAssignedKraTargets,
} from "@/lib/performance-engine";
import MyTargetsClient from "./MyTargetsClient";

/**
 * Phase W8.4 — read-only "My KRA Targets" page (Enterprise KRA).
 *
 * Self-scoped: shows the logged-in employee's own assigned KPI targets. For managers it also
 * shows a READ-ONLY "My Team's KRA Targets" section (direct reports). This is the employee/manager
 * VISIBILITY surface — distinct from Settings → Performance (admin assignment/config). No edits,
 * no achievement/scoring, no raw JSON, no raw employee IDs. Read-only DB reads only.
 */
export default async function MyTargetsPage() {
  const session = await getSession();
  const employeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!session?.user || !employeeId) redirect("/login");

  const isManager = Boolean(session.user.isManager);

  const [mine, team] = await Promise.all([
    getMyAssignedKraTargets(employeeId),
    isManager ? getManagerTeamAssignedKraTargets(employeeId) : Promise.resolve([]),
  ]);

  return (
    <MyTargetsClient
      mine={JSON.parse(JSON.stringify(mine))}
      team={JSON.parse(JSON.stringify(team))}
      isManager={isManager}
      fallbackName={session.user.name ?? ""}
    />
  );
}
