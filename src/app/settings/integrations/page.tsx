import { redirect }     from "next/navigation";
import { getSession }   from "@/lib/dev-session";
import {
  listProviders,
  listConnections,
  listCredentials,
  listIntegrationLogs,
} from "@/lib/integration-engine";
import IntegrationAdminClient from "./IntegrationAdminClient";

export default async function IntegrationAdminPage() {
  const session = await getSession();
  if (!session?.user?.isManager) redirect("/dashboard");

  const [providers, connections, credentials, logs] = await Promise.all([
    listProviders(),
    listConnections(),
    listCredentials(),
    listIntegrationLogs({ limit: 50 }),
  ]);

  // Strip secretRef from connections — never send to frontend
  const safeConnections = connections.map(c => ({ ...c, secretRef: c.secretRef ? "[set]" : null }));

  return (
    <IntegrationAdminClient
      initialProviders={JSON.parse(JSON.stringify(providers))}
      initialConnections={JSON.parse(JSON.stringify(safeConnections))}
      initialCredentials={JSON.parse(JSON.stringify(credentials))}
      initialLogs={JSON.parse(JSON.stringify(logs))}
    />
  );
}
