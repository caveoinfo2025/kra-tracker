# Attack Path: cand-002-approval-request-idor-and-arbitrary-actions

- Reachability: any signed-in employee can call `/api/approvals` to obtain request metadata or can guess sequential numeric ids, then submit `APPROVE`, `REJECT`, `RETURN`, `DELEGATE`, or `CANCEL` actions against another user's request.
- Consequence:
  - Approval inbox integrity is broken because business approvals can be forced to terminal states by unauthorized actors.
  - The same surface leaks request metadata across teams and modules.
- Severity rationale: high. The issue crosses a meaningful business-control boundary, but current repository evidence shows approval state is primarily consumed as workflow integrity rather than as an immediate money-movement or code-execution primitive.
