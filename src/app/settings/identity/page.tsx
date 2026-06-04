import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";
import IdentityClient from "./IdentityClient";

async function checkIdentityPermission(userId: number, action: "VIEW" | "EDIT"): Promise<boolean> {
  try {
    const { hasPermission } = await import("@/lib/access-control");
    return await hasPermission(userId, "Settings", "Identity", action);
  } catch {
    return false;
  }
}

export default async function IdentityPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = session.user.employeeId ?? 0;

  const canView = await checkIdentityPermission(userId, "VIEW") || canAccessSettings(session.user);
  if (!canView) redirect("/dashboard");

  const canEdit = await checkIdentityPermission(userId, "EDIT") || canAccessSettings(session.user);

  return <IdentityClient canEdit={canEdit} />;
}
