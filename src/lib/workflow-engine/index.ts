/**
 * Workflow Engine — Public API
 *
 * Re-exports every public function from the sub-modules so callers can import
 * from a single entry point: `@/lib/workflow-engine`.
 */

// Audit
export {
  logWorkflowEvent,
  getWorkflowAudit,
  listWorkflowAuditLog,
} from "./audit";
export type { WorkflowAuditAction, WorkflowAuditEntry } from "./audit";

// Resolver
export { resolveApprovers } from "./resolver";
export type { ResolvedApprover } from "./resolver";

// Delegation
export {
  getActiveDelegate,
  createDelegation,
  revokeDelegation,
  listDelegations,
} from "./delegation";
export type { DelegationRule } from "./delegation";

// Escalation
export {
  getEscalationRules,
  createEscalationRule,
  checkAndTriggerEscalations,
} from "./escalation";
export type { EscalationRule } from "./escalation";

// Workflow definitions
export {
  listWorkflows,
  getWorkflow,
  getWorkflowByCode,
  createWorkflow,
  updateWorkflow,
} from "./workflow";
export type { WorkflowDefinition, WorkflowStep } from "./workflow";

// Approval requests
export {
  startApproval,
  listApprovalRequests,
  getApprovalRequest,
  getPendingForApprover,
  approveRequest,
  rejectRequest,
  returnRequest,
  delegateRequest,
  cancelRequest,
} from "./approval";
export type { ApprovalRequest } from "./approval";
