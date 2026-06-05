import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { hasPermission } from "@/lib/access-control";
import { isOperationsHead, hasManagerReach } from "@/lib/roles";
import MasterDataClient from "./MasterDataClient";

export const metadata = { title: "Master Data Management | Caveo CRM" };

export default async function MastersPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user      = session.user;
  const userId    = user.employeeId!;
  const isOpsHead = isOperationsHead(user);
  const isManager = !!user.isManager || hasManagerReach(user);

  const [canView, canEdit] = await Promise.all([
    hasPermission(userId, "Settings", "Masters", "VIEW"),
    hasPermission(userId, "Settings", "Masters", "EDIT"),
  ]);

  const effectiveView = canView || isOpsHead || isManager;
  const effectiveEdit = canEdit || isOpsHead || isManager;

  if (!effectiveView) redirect("/settings");

  return (
    <MasterDataClient
      canEdit={effectiveEdit}
      currentUserId={userId}
    />
  );
}
