import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";
import AdminConsole from "./AdminConsole";
// SettingsHub kept for rollback — swap import below to revert
// import SettingsHub from "./SettingsHub";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canAccessSettings(session.user)) redirect("/dashboard");
  return <AdminConsole />;
  // return <SettingsHub />;
}
