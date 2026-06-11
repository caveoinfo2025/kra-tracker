# Validation: cand-002-approval-request-idor-and-arbitrary-actions

- Method: static route-to-service review
- Result: survives
- Evidence:
  - `src/app/api/approvals/route.ts:17-23` calls `listApprovalRequests` with user-controlled query filters and no ownership clamp, so omitting filters returns broad approval data to any authenticated caller.
  - `src/app/api/approvals/[id]/action/route.ts:30-47` dispatches approval actions for any authenticated caller based only on `requestId`.
  - `src/lib/workflow-engine/approval.ts:188-311` updates approval state and logs actions, but the mutation helpers never compare `actorId` against `resolveApprovers(...)`.
  - The only approver eligibility check appears in `getPendingForApprover` at `src/lib/workflow-engine/approval.ts:153-161`, which is used for inbox display and not enforced in mutation paths.
- Counterevidence checked:
  - No manager override or requester-only guard is present in the action route.
  - No approval-request ownership lookup occurs before update calls.
