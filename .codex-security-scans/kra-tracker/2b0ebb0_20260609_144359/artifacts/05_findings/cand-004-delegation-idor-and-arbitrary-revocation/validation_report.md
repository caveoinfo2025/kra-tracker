# Validation: cand-004-delegation-idor-and-arbitrary-revocation

- Method: static route-to-service review
- Result: survives
- Evidence:
  - `src/app/api/delegations/route.ts:10-13` passes a caller-controlled `userId` into `listDelegations(...)`.
  - `src/lib/workflow-engine/delegation.ts:113` turns that into `OR: [{ fromUser: opts.userId }, { toUser: opts.userId }]`, exposing another user's delegations.
  - `src/app/api/delegations/[id]/route.ts:13` revokes by numeric id only.
  - `src/lib/workflow-engine/delegation.ts:91-94` updates the selected row to `INACTIVE` without verifying ownership or role.
- Counterevidence checked:
  - There is no manager-only gate or ownership lookup on either path.
