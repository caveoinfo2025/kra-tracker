import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";
import PolicyClient from "./PolicyClient";

async function checkPolicyPermission(userId: number, action: "VIEW" | "EDIT"): Promise<boolean> {
  try {
    const { hasPermission } = await import("@/lib/access-control");
    return await hasPermission(userId, "Settings", "Policy", action);
  } catch {
    return false;
  }
}

export default async function PoliciesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = session.user.employeeId ?? 0;

  const canView = await checkPolicyPermission(userId, "VIEW") || canAccessSettings(session.user);
  if (!canView) redirect("/dashboard");

  const canEdit = await checkPolicyPermission(userId, "EDIT") || canAccessSettings(session.user);

  return <PolicyClient canEdit={canEdit} />;
}
