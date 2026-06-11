import { redirect }   from "next/navigation";
import { getSession } from "@/lib/dev-session";
import {
  getPasswordPolicy,
  getMFAPolicy,
  getSessionPolicy,
  getAccessPolicy,
  getDataProtectionPolicy,
  listSecurityLogs,
} from "@/lib/security-engine";
import SecurityAdminClient from "./SecurityAdminClient";

export default async function SecurityAdminPage() {
  const session = await getSession();
  if (!session?.user?.isManager) redirect("/dashboard");

  const [passwordPolicy, mfaPolicy, sessionPolicy, accessPolicy, dataPolicy, logs] =
    await Promise.all([
      getPasswordPolicy(),
      getMFAPolicy(),
      getSessionPolicy(),
      getAccessPolicy(),
      getDataProtectionPolicy(),
      listSecurityLogs({ limit: 50 }),
    ]);

  return (
    <SecurityAdminClient
      initialPasswordPolicy={JSON.parse(JSON.stringify(passwordPolicy ?? null))}
      initialMFAPolicy={JSON.parse(JSON.stringify(mfaPolicy ?? null))}
      initialSessionPolicy={JSON.parse(JSON.stringify(sessionPolicy ?? null))}
      initialAccessPolicy={JSON.parse(JSON.stringify(accessPolicy ?? null))}
      initialDataPolicy={JSON.parse(JSON.stringify(dataPolicy ?? null))}
      initialLogs={JSON.parse(JSON.stringify(logs))}
    />
  );
}
