import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";
import { getSettingsCapabilities } from "@/lib/access-control";
import AdminConsole from "./AdminConsole";
// SettingsHub kept for rollback — swap import below to revert
// import SettingsHub from "./SettingsHub";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const capabilities = await getSettingsCapabilities(session);
  // Manager fallback preserved (getSettingsCapabilities grants all cards to
  // isManager). canAccessSettings() is kept as a bridge so Operations Head /
  // Head of Sales — who may not yet hold an explicit Settings/* permission
  // row — still land on the page during the migration.
  const canView = capabilities.canViewSettings || canAccessSettings(session.user);
  if (!canView) redirect("/dashboard");

  return <AdminConsole cards={capabilities.cards} bridgeAccess={canAccessSettings(session.user)} />;
  // return <SettingsHub />;
}
