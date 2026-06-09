/**
 * Communication Engine — Public API
 *
 * Main entry point: triggerEvent()
 *
 * Usage:
 *   import { triggerEvent } from "@/lib/communication-engine";
 *
 *   await triggerEvent({
 *     module:    "CRM",
 *     eventCode: "LEAD_CREATED",
 *     data:      { leadId: "123", ownerId: "456", customerName: "ABC Ltd" },
 *   });
 */

export * from "./events";
export * from "./channels";
export * from "./templates";
export * from "./rules";
export * from "./recipients";
export * from "./queue";
export * from "./delivery";
export * from "./audit";

import { getCommunicationEventByCode }  from "./events";
import { getActiveRulesForEvent, evaluateRuleCondition } from "./rules";
import { resolveRecipients }            from "./recipients";
import { listNotificationTemplates, renderTemplate } from "./templates";
import { enqueueNotification }          from "./queue";
import { processNotificationQueue }     from "./delivery";
import { logCommunicationAudit }        from "./audit";

export interface TriggerEventInput {
  /** Admin module: CRM | Finance | Workflow | Performance | Security */
  module: string;
  /** Unique event code: LEAD_CREATED | APPROVAL_PENDING | etc. */
  eventCode: string;
  /** Contextual data used for condition evaluation and template rendering */
  data: Record<string, unknown>;
  /** Employee ID that triggered the event (for audit) */
  triggeredBy?: number;
}

export interface TriggerEventResult {
  eventId: number | null;
  rulesEvaluated: number;
  rulesMatched: number;
  notificationsQueued: number;
}

/**
 * triggerEvent — the single call-site for all communication events.
 *
 * Safe to call before DB migration (fail-open).
 * Never throws — returns a result with zeroed counts on error.
 */
export async function triggerEvent(input: TriggerEventInput): Promise<TriggerEventResult> {
  const result: TriggerEventResult = {
    eventId: null,
    rulesEvaluated: 0,
    rulesMatched: 0,
    notificationsQueued: 0,
  };

  try {
    // 1. Find event
    const event = await getCommunicationEventByCode(input.eventCode);
    if (!event || event.status !== "active") return result;
    result.eventId = event.id;

    // 2. Get active rules for this event
    const rules = await getActiveRulesForEvent(event.id);
    result.rulesEvaluated = rules.length;

    // 3. For each rule, evaluate conditions and resolve recipients
    const queueIds: number[] = [];

    for (const rule of rules) {
      const conditionMet = evaluateRuleCondition(rule.conditionJson, input.data);
      if (!conditionMet) continue;
      result.rulesMatched++;

      // Parse recipient and channel specs
      let recipientSpec: { type: string; value: string } = { type: "RECORD_OWNER", value: "" };
      let channels: string[] = ["IN_APP"];

      try {
        if (rule.recipientJson) recipientSpec = JSON.parse(rule.recipientJson);
      } catch { /* keep default */ }

      try {
        if (rule.channelJson) {
          const parsed = JSON.parse(rule.channelJson) as { channels?: string[] };
          if (parsed.channels?.length) channels = parsed.channels;
        }
      } catch { /* keep default */ }

      // Resolve recipients
      const recipients = await resolveRecipients(
        recipientSpec as Parameters<typeof resolveRecipients>[0],
        input.data,
      );

      // 4. For each channel, find best matching template
      const templates = await listNotificationTemplates(event.id);

      for (const channel of channels) {
        // Pick template: channel-specific first, then channel-agnostic
        const template =
          templates.find((t) => t.status === "active" && t.channel?.channelCode === channel) ??
          templates.find((t) => t.status === "active" && !t.channelId) ??
          null;

        for (const recipient of recipients) {
          // Build variable map from event data + recipient data
          const variables: Record<string, string> = {};
          for (const [k, v] of Object.entries(input.data)) {
            variables[k] = String(v ?? "");
          }
          variables.recipientName  = recipient.name;
          variables.recipientEmail = recipient.email;

          let renderedSubject = template?.subject ?? event.eventName;
          let renderedBody    = template?.body    ?? "";

          if (template) {
            const rendered = renderTemplate(
              { subject: template.subject, body: template.body },
              variables,
            );
            renderedSubject = rendered.subject;
            renderedBody    = rendered.body;
          }

          // 5. Enqueue notification
          const queued = await enqueueNotification({
            eventId:         event.id,
            templateId:      template?.id,
            recipientUserId: recipient.employeeId,
            channel,
            payloadJson: JSON.stringify({
              subject: renderedSubject,
              body:    renderedBody,
              link:    String(input.data.link ?? ""),
              data:    input.data,
            }),
          });
          queueIds.push(queued.id);
          result.notificationsQueued++;
        }
      }
    }

    // 6. Process IN_APP immediately; leave others pending
    if (queueIds.length > 0) {
      await processNotificationQueue(queueIds);
    }

    // 7. Audit
    if (result.notificationsQueued > 0) {
      await logCommunicationAudit({
        entityType:  "communication_event",
        entityId:    event.id,
        action:      "TRIGGER",
        newValue:    JSON.stringify({ eventCode: input.eventCode, queued: result.notificationsQueued }),
        performedBy: input.triggeredBy ?? 0,
      });
    }
  } catch {
    // triggerEvent must NEVER block the calling business flow
  }

  return result;
}
