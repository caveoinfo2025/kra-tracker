import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import {
  listCommunicationEvents,
  listNotificationChannels,
  listNotificationTemplates,
  listNotificationRules,
  listQueue,
  countByStatus,
} from "@/lib/communication-engine";
import CommunicationAdminClient from "./CommunicationAdminClient";

export default async function CommunicationAdminPage() {
  const session = await getSession();
  if (!session?.user?.isManager) redirect("/dashboard");

  const [events, channels, templates, rules, queue, queueCounts] = await Promise.all([
    listCommunicationEvents(),
    listNotificationChannels(),
    listNotificationTemplates(),
    listNotificationRules(),
    listQueue({ status: "PENDING" }),
    countByStatus(),
  ]);

  // Strip configJson from channels (never expose to frontend)
  const safeChannels = channels.map(({ configJson: _cfg, ...c }) => c);

  return (
    <CommunicationAdminClient
      initialEvents={JSON.parse(JSON.stringify(events))}
      initialChannels={JSON.parse(JSON.stringify(safeChannels))}
      initialTemplates={JSON.parse(JSON.stringify(templates))}
      initialRules={JSON.parse(JSON.stringify(rules))}
      initialQueue={JSON.parse(JSON.stringify(queue))}
      queueCounts={queueCounts}
    />
  );
}
