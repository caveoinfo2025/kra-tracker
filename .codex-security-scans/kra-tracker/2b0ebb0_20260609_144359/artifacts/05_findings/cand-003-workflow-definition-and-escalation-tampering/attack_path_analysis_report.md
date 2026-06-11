# Attack Path: cand-003-workflow-definition-and-escalation-tampering

- Reachability: any authenticated employee can call the workflow and escalation endpoints directly, independent of what the UI exposes.
- Consequence:
  - Attackers can define permissive approval steps, replace approvers, or attach auto-approve escalation behavior to sensitive flows.
  - This undermines approval-engine trust for expenses, opportunities, and any later business process that uses the shared workflow engine.
- Severity rationale: high. Repository evidence shows these definitions are live configuration for cross-module approval behavior, but the current code does not show a direct one-shot financial payout path from a single tampered request.
