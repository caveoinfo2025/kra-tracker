# Finding Discovery Report

Scan id: `2b0ebb0_20260609_144359`
Scope: repository-wide scan of `C:\Users\VIJESHVIJAYAN\Code\kra-tracker`

## Discovery Summary

- Generated `rank_input.csv` and `deep_review_input.csv` with 2003 source-like rows.
- Used `docs/SECURITY_MODEL.md` as the authoritative repository threat model and copied it into the per-scan context directory.
- Performed a high-impact frontier pass across the server-side trust boundaries most likely to yield meaningful security impact:
  - authentication and session gatekeeping
  - workflow and approval mutation APIs
  - delegation and escalation APIs
  - import, OCR, and external-fetch paths
  - operational scripts with credential or shell/network access

## Candidate Findings

### cand-001-hardcoded-live-infra-credentials

- Title: Repository contains live SSH and database credentials in an operational helper script
- Instance key: `hardcoded-credentials:scripts/db-copy-prod-to-dev.mjs:11`
- Attacker-controlled source: repository read access by any collaborator, CI job, or leaked source archive
- Broken control: secrets are embedded directly in a committed helper script
- Impact: compromise of production SSH access plus development database access
- Affected locations:
  - `scripts/db-copy-prod-to-dev.mjs:11` (`root_control`)
  - `scripts/db-copy-prod-to-dev.mjs:14` (`sink`)
  - `scripts/db-copy-prod-to-dev.mjs:23` (`sink`)
- Validation recommended: yes
- CWE: CWE-798, CWE-522

### cand-002-approval-request-idor-and-arbitrary-actions

- Title: Approval request APIs allow any authenticated user to enumerate and mutate requests they do not own
- Instance key: `authz-bypass:src/app/api/approvals/[id]/action/route.ts:15`
- Attacker-controlled source: any authenticated employee calling `/api/approvals` and `/api/approvals/[id]/action`
- Broken control: request listing trusts caller-supplied filters and action handlers never verify that the actor is the current approver, requester, or manager
- Impact: unauthorized approval, rejection, return, cancellation, and visibility into other users' workflow requests
- Affected locations:
  - `src/app/api/approvals/route.ts:17` (`entrypoint/wrapper`)
  - `src/app/api/approvals/[id]/action/route.ts:15` (`entrypoint/wrapper`)
  - `src/lib/workflow-engine/approval.ts:188` (`sink`)
  - `src/lib/workflow-engine/approval.ts:204` (`sink`)
  - `src/lib/workflow-engine/approval.ts:235` (`sink`)
  - `src/lib/workflow-engine/approval.ts:264` (`sink`)
  - `src/lib/workflow-engine/approval.ts:309` (`sink`)
- Validation recommended: yes
- CWE: CWE-639, CWE-862, CWE-285

### cand-003-workflow-definition-and-escalation-tampering

- Title: Any authenticated user can create or rewrite workflow definitions and escalation rules
- Instance key: `authz-bypass:src/app/api/workflows/route.ts:18`
- Attacker-controlled source: any authenticated employee calling workflow admin APIs directly
- Broken control: workflow and escalation mutation routes check authentication only, then write live approval-engine configuration
- Impact: unauthorized creation of permissive workflows and auto-approve or auto-reject escalation policies for sensitive approval paths
- Affected locations:
  - `src/app/api/workflows/route.ts:18` (`entrypoint/wrapper`)
  - `src/app/api/workflows/[id]/route.ts:20` (`entrypoint/wrapper`)
  - `src/app/api/escalation-rules/route.ts:18` (`entrypoint/wrapper`)
  - `src/lib/workflow-engine/workflow.ts:91` (`sink`)
  - `src/lib/workflow-engine/workflow.ts:130` (`sink`)
  - `src/lib/workflow-engine/escalation.ts:34` (`sink`)
  - `src/lib/workflow-engine/escalation.ts:134` (`concrete_implementation`)
- Validation recommended: yes
- CWE: CWE-285, CWE-862, CWE-732

### cand-004-delegation-idor-and-arbitrary-revocation

- Title: Delegation APIs expose other users' delegation records and allow arbitrary revocation by id
- Instance key: `authz-bypass:src/app/api/delegations/route.ts:10`
- Attacker-controlled source: any authenticated employee calling `/api/delegations?userId=<victim>` and `/api/delegations/[id]`
- Broken control: delegation listing trusts caller-supplied `userId`, and revocation updates records by primary key without checking ownership
- Impact: privacy exposure of internal delegation mappings and denial of service against active approval delegates
- Affected locations:
  - `src/app/api/delegations/route.ts:10` (`entrypoint/wrapper`)
  - `src/app/api/delegations/[id]/route.ts:13` (`entrypoint/wrapper`)
  - `src/lib/workflow-engine/delegation.ts:113` (`sink`)
  - `src/lib/workflow-engine/delegation.ts:91` (`sink`)
- Validation recommended: yes
- CWE: CWE-639, CWE-862, CWE-200

## Discovery Notes

- Authentication and edge gating are generally present for the main business APIs. The strongest issues surfaced inside the newer workflow-engine routes and one newly added operational script.
- No raw SQL, template execution, or server-side path traversal sinks were identified in the reviewed runtime code.
- Import and OCR paths appear authenticated and bounded, but they remain useful follow-up surfaces because they process untrusted file or image content.
