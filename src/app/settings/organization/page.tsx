import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";
import OrganizationClient from "./OrganizationClient";

async function checkOrgPermission(userId: number, action: "VIEW" | "EDIT"): Promise<boolean> {
  try {
    const { hasPermission } = await import("@/lib/access-control");
    return await hasPermission(userId, "Settings", "Organization", action);
  } catch {
    return false;
  }
}

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = session.user.employeeId ?? 0;

  // Try new permission system first; fall back to legacy gate
  const canView = await checkOrgPermission(userId, "VIEW") || canAccessSettings(session.user);
  if (!canView) redirect("/dashboard");

  const canEdit = await checkOrgPermission(userId, "EDIT") || canAccessSettings(session.user);

  return <OrganizationClient canEdit={canEdit} />;
}
