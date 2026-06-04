/**
 * Action types for the Policy Engine.
 *
 * Actions are stored as JSON in PolicyRule.actionJson.
 * When a rule's condition matches, its action is collected and returned
 * to the caller by evaluatePolicy().
 */

export type ActionType =
  | "ALLOW"
  | "BLOCK"
  | "REQUIRE_APPROVAL"
  | "SEND_NOTIFICATION"
  | "CREATE_TASK"
  | "ESCALATE";

export interface AllowAction         { type: "ALLOW" }
export interface BlockAction         { type: "BLOCK";              reason?: string }
export interface RequireApprovalAction { type: "REQUIRE_APPROVAL"; level: number; roleId?: number }
export interface SendNotificationAction { type: "SEND_NOTIFICATION"; templateKey: string; recipientRole?: string }
export interface CreateTaskAction    { type: "CREATE_TASK";        title: string;  assigneeRole?: string }
export interface EscalateAction      { type: "ESCALATE";           level: number;  reason?: string }

export type PolicyActionDef =
  | AllowAction
  | BlockAction
  | RequireApprovalAction
  | SendNotificationAction
  | CreateTaskAction
  | EscalateAction;

/** Parse actionJson string. Returns null on malformed JSON. */
export function parseActionJson(json: string): PolicyActionDef | null {
  try {
    return JSON.parse(json) as PolicyActionDef;
  } catch {
    return null;
  }
}

/** Whether this action type blocks execution (short-circuit on BLOCK). */
export function isBlockingAction(action: PolicyActionDef): boolean {
  return action.type === "BLOCK";
}
