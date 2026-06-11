# Validation: cand-003-workflow-definition-and-escalation-tampering

- Method: static route-to-database review
- Result: survives
- Evidence:
  - `src/app/api/workflows/route.ts:18-40` allows any authenticated user to create workflow definitions.
  - `src/app/api/workflows/[id]/route.ts:20-39` allows any authenticated user to patch existing workflow definitions.
  - `src/app/api/escalation-rules/route.ts:18-36` allows any authenticated user to create escalation rules.
  - `src/lib/workflow-engine/escalation.ts:134-144` implements `AUTO_APPROVE` and `AUTO_REJECT`, proving the unauthorized configuration directly controls terminal approval outcomes.
- Counterevidence checked:
  - The admin UI may be manager-oriented, but the HTTP routes themselves do not enforce manager or permission checks.
  - The service layer performs direct writes and does not add a compensating authorization check.
