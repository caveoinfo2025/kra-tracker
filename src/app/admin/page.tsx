import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import { getAllSettings, SETTING_META } from "@/lib/settings";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isManager) redirect("/dashboard");

  const values = await getAllSettings();

  // Build enriched settings array
  const settings = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    ...(SETTING_META[key] ?? { category: "misc", label: key, description: "" }),
  }));

  return <AdminClient settings={settings} />;
}
