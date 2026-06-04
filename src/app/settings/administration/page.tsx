import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";
import { getAllSettings, SETTING_META } from "@/lib/settings";
import AdminClient from "@/app/admin/AdminClient";

export default async function AdministrationPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canAccessSettings(session.user)) redirect("/dashboard");

  const values = await getAllSettings();

  const settings = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    ...(SETTING_META[key] ?? { category: "misc", label: key, description: "" }),
  }));

  return <AdminClient settings={settings} />;
}
