# Security Review: kra-tracker

## Scope

- Scan mode: repository-wide Codex Security scan.
- Repository root: `C:\Users\VIJESHVIJAYAN\Code\kra-tracker`
- Scan id: `2b0ebb0_20260609_144359`
- Threat model source: existing repository guidance from `docs/SECURITY_MODEL.md`, copied into `artifacts/01_context/threat_model.md`.
- Worklists generated: `artifacts/02_discovery/rank_input.csv` and `artifacts/02_discovery/deep_review_input.csv` with 2003 source-like rows.
- Primary artifacts reviewed:
  - `artifacts/02_discovery/finding_discovery_report.md`
  - `artifacts/03_coverage/repository_coverage_ledger.md`
  - `artifacts/05_findings/validation_summary.md`
  - `artifacts/05_findings/attack_path_analysis_report.md`
- Runtime status: static source review only. No network lookups and no live exploit harnesses were used.
- Limitation: the default temp artifact root was not writable in this environment, so the scan bundle was written under `.codex-security-scans/` inside the repository workspace instead.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 4 |
| Severity mix | 1 critical, 2 high, 1 medium |
| Confidence mix | 4 high |
| Coverage focus | Auth/session, workflow engine, delegation APIs, import/OCR surfaces, operational scripts |
| Validation mode | Static route-to-service and source inspection |
| Markdown report | `C:\Users\VIJESHVIJAYAN\Code\kra-tracker\.codex-security-scans\kra-tracker\2b0ebb0_20260609_144359\report.md` |
| HTML report | `C:\Users\VIJESHVIJAYAN\Code\kra-tracker\.codex-security-scans\kra-tracker\2b0ebb0_20260609_144359\report.html` |

## Threat Model

### Overview

- `kra-tracker` is a Next.js 16 business application that combines CRM, finance, employee-performance tracking, and workflow approvals.
- Core assets include employee identity, approval integrity, customer and vendor master data, pipeline and finance records, and administrative configuration.
- The repository runs with Microsoft Entra ID authentication, Prisma-backed database access, and many authenticated REST endpoints under `src/app/api/**`.

### Threat Model, Trust Boundaries, and Assumptions

- Primary trust boundary: unauthenticated internet traffic versus authenticated employee sessions enforced by `src/proxy.ts` and `auth.config.ts`.
- Secondary trust boundaries:
  - ordinary employees versus managers and finance or admin roles
  - user-controlled request bodies, query parameters, file imports, and OCR images versus server-side workflow, finance, and CRM state
  - repository and deployment operators versus code contributors with workspace or source access
- Assumptions recorded in the repository guidance:
  - authentication is delegated to Microsoft Entra ID; the app stores no local passwords
  - most API routes are expected to call `getSession()` and then apply ownership or role checks
  - workflow, finance, and admin modules are intended to enforce stronger authorization than ordinary employee data-entry paths

### Attack Surface, Mitigations, and Attacker Stories

- Important exposed surfaces:
  - authenticated REST APIs for approvals, workflows, delegations, customers, finance, OCR, and imports
  - privileged workflow-engine configuration routes that govern approval behavior across modules
  - scripts and deployment helpers that may contain secrets or privileged operational logic
- Existing mitigations:
  - edge authorization wrapper in `src/proxy.ts`
  - NextAuth session handling in `auth.ts`
  - many legacy CRUD APIs perform ownership checks against `employeeId`
- Realistic attacker stories:
  - an ordinary authenticated employee calls workflow APIs directly rather than using the intended UI
  - a developer, contractor, CI environment, or leaked archive gains read access to the repository contents
  - a user submits untrusted file or image input to import or OCR endpoints

### Severity Calibration (Critical, High, Medium, Low)

- Critical:
  - exposure of live infrastructure credentials
  - flaws that directly grant control-plane, production host, or database access
- High:
  - authenticated authorization bypasses that let one employee alter shared approval state or policy
  - business-control failures that undermine approval integrity across modules
- Medium:
  - cross-user data exposure or state tampering with narrower blast radius, such as delegation disruption
- Low:
  - weaker hardening gaps or secondary configuration issues that do not independently break a meaningful trust boundary

## Findings

| Severity | Finding |
| --- | --- |
| critical | [Repository contains live SSH and database credentials in an operational helper script](#1-repository-contains-live-ssh-and-database-credentials-in-an-operational-helper-script) |
| high | [Approval request APIs allow any authenticated user to enumerate and mutate requests they do not own](#2-approval-request-apis-allow-any-authenticated-user-to-enumerate-and-mutate-requests-they-do-not-own) |
| high | [Any authenticated user can create or rewrite workflow definitions and escalation rules](#3-any-authenticated-user-can-create-or-rewrite-workflow-definitions-and-escalation-rules) |
| medium | [Delegation APIs expose other users' delegation records and allow arbitrary revocation by id](#4-delegation-apis-expose-other-users-delegation-records-and-allow-arbitrary-revocation-by-id) |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report |

### [1] Repository contains live SSH and database credentials in an operational helper script

| Field | Value |
| --- | --- |
| Severity | critical |
| Confidence | high |
| Confidence rationale | The script contains plaintext credentials and uses them in operational commands, so no additional reachability proof is needed beyond repository read access. |
| Category | Hardcoded credentials |
| CWE | CWE-798: Use of Hard-coded Credentials; CWE-522: Insufficiently Protected Credentials |
| Affected lines | `scripts/db-copy-prod-to-dev.mjs:11`, `scripts/db-copy-prod-to-dev.mjs:14`, `scripts/db-copy-prod-to-dev.mjs:23` |

#### Summary

The repository currently contains a helper script that embeds live SSH and database credentials directly in source. Anyone who can read the checkout can recover the production SSH password and development database password without interacting with the application itself.

#### Validation

- Method: direct source inspection
- Evidence: the script hardcodes `host`, `username`, and `password` for SSH, plus a development database password, and then injects those values into `mysqldump` and `mysql` commands.
- Remaining uncertainty: none that materially affects reportability. The only uncertainty is whether the exposed credentials have already been rotated.

#### Dataflow

Repository checkout -> `scripts/db-copy-prod-to-dev.mjs` literals -> SSH connection config and MySQL command strings -> privileged infrastructure access.

#### Reachability

Any party with repository read access, a copied workspace, CI artifact access, or backup access can extract the credentials. No valid user session in the app is required. The likely attacker outcomes are host compromise, production environment disclosure, and database compromise.

#### Severity

Critical. This is a direct exposure of reusable privileged secrets rather than a conditional application bug. The severity would drop only if the credentials were demonstrably fake or already rotated everywhere they apply.

#### Remediation

- Remove the script from the repository or replace the literals with environment-based secret loading.
- Rotate the exposed SSH and database credentials immediately.
- Add secret scanning in CI and pre-commit checks for scripts and environment-like material.
- Treat any derivative copies of the workspace as potentially compromised until rotation is complete.

### [2] Approval request APIs allow any authenticated user to enumerate and mutate requests they do not own

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | The route and service code directly shows broad request listing and state mutation with no ownership or approver validation in the write path. |
| Category | Authorization bypass / IDOR |
| CWE | CWE-639: Authorization Bypass Through User-Controlled Key; CWE-862: Missing Authorization; CWE-285: Improper Authorization |
| Affected lines | `src/app/api/approvals/route.ts:17`, `src/app/api/approvals/[id]/action/route.ts:15`, `src/lib/workflow-engine/approval.ts:188`, `src/lib/workflow-engine/approval.ts:204`, `src/lib/workflow-engine/approval.ts:235`, `src/lib/workflow-engine/approval.ts:264`, `src/lib/workflow-engine/approval.ts:309` |

#### Summary

The approval engine exposes read and write APIs to any authenticated employee without verifying that the caller is the request owner, assigned approver, or a privileged reviewer. As a result, a normal employee can inspect approval requests outside their scope and force another team's requests into approved, rejected, returned, delegated, or cancelled states.

#### Validation

- Method: static route-to-service review
- Checklist:
  - verified request listing behavior in `src/app/api/approvals/route.ts`
  - verified action dispatch behavior in `src/app/api/approvals/[id]/action/route.ts`
  - verified approval state transitions in `src/lib/workflow-engine/approval.ts`
  - checked for compensating approver validation in service helpers
- Evidence:
  - `GET /api/approvals` forwards caller-controlled filters into `listApprovalRequests(...)` and does not clamp results to the current user.
  - `POST /api/approvals/[id]/action` forwards the authenticated actor into mutation helpers without any authorization branch.
  - The mutation helpers update approval state directly, while the only approver eligibility logic lives in `getPendingForApprover(...)`, which is not reused for mutations.
- Remaining uncertainty: none material for the API bug itself. The exact downstream business consequence depends on which modules consume approval state.

#### Dataflow

Authenticated request -> `/api/approvals` or `/api/approvals/[id]/action` -> workflow-engine approval service -> `approvalRequest` and `approvalAction` table writes -> approval status and audit trail changed.

#### Reachability

Any signed-in employee can trigger this path. They can enumerate requests directly by calling `GET /api/approvals` without restrictive filters, or they can guess sequential numeric ids. They can then submit an action payload to mutate approval state for another user's request. The attacker outcome is cross-team approval tampering and visibility into sensitive request metadata.

#### Severity

High. The flaw breaks a meaningful authorization boundary and undermines business-control integrity across modules. Severity would rise if a downstream module auto-executed privileged financial or provisioning actions solely from approval status, and it would fall only if all consumer modules independently revalidated approvers before trusting approval state.

#### Remediation

- Clamp `GET /api/approvals` to the current requester or explicit privileged roles unless `inbox=true` or an admin-only capability is present.
- In every mutation helper, resolve the current step approvers and reject actors who are not eligible approvers, delegates, or privileged admins.
- Restrict `CANCEL` to the original requester or privileged operators.
- Add integration tests for unauthorized cross-user reads and approval actions.

### [3] Any authenticated user can create or rewrite workflow definitions and escalation rules

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | The mutation routes are authentication-only and write directly into live workflow and escalation tables, including auto-approve behaviors. |
| Category | Authorization bypass / administrative policy tampering |
| CWE | CWE-285: Improper Authorization; CWE-862: Missing Authorization; CWE-732: Incorrect Permission Assignment for Critical Resource |
| Affected lines | `src/app/api/workflows/route.ts:18`, `src/app/api/workflows/[id]/route.ts:20`, `src/app/api/escalation-rules/route.ts:18`, `src/lib/workflow-engine/workflow.ts:91`, `src/lib/workflow-engine/workflow.ts:130`, `src/lib/workflow-engine/escalation.ts:34`, `src/lib/workflow-engine/escalation.ts:134` |

#### Summary

The workflow engine’s configuration endpoints accept any authenticated session and then write live workflow definitions and escalation rules. Because escalation rules support `AUTO_APPROVE` and `AUTO_REJECT`, a normal employee can tamper with shared approval-policy state rather than only their own data.

#### Validation

- Method: static route and service review
- Evidence:
  - `POST /api/workflows` creates workflow definitions after only `getSession()` succeeds.
  - `PATCH /api/workflows/[id]` updates existing workflow definitions with the same weak gate.
  - `POST /api/escalation-rules` creates live escalation rules with no manager or permission check.
  - The escalation service implements terminal `AUTO_APPROVE` and `AUTO_REJECT` paths.
- Remaining uncertainty: none material for reportability. The repository already shows real modules using the shared workflow engine for expenses and opportunities.

#### Dataflow

Authenticated request -> workflow or escalation route -> workflow-engine service -> `workflowDefinition` or `escalationRule` table write -> later approval processing consumes attacker-controlled policy.

#### Reachability

Any signed-in employee can call these endpoints directly. They do not need access to the admin UI. The attacker can create permissive approval steps, rewrite existing workflow definitions, or add auto-approve escalation behavior that changes future approval outcomes across modules.

#### Severity

High. This is a shared control-plane tampering issue inside the approval engine. Severity would rise if additional repository evidence showed that these workflows directly gate financial disbursement or other irreversible privileged actions without independent review, and would fall only if the routes were isolated behind an external administrative gateway not reflected in this codebase.

#### Remediation

- Restrict workflow and escalation mutations to manager-only or explicit workflow-admin permissions.
- Enforce the same authorization in the service layer, not only in UI routing.
- Add audit alerts for workflow-definition and escalation changes.
- Add regression tests proving ordinary employees receive `403` on all workflow-admin mutation endpoints.

### [4] Delegation APIs expose other users' delegation records and allow arbitrary revocation by id

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | The routes and service helpers show direct cross-user lookup and revoke-by-id behavior with no ownership check. |
| Category | Authorization bypass / IDOR |
| CWE | CWE-639: Authorization Bypass Through User-Controlled Key; CWE-862: Missing Authorization; CWE-200: Exposure of Sensitive Information to an Unauthorized Actor |
| Affected lines | `src/app/api/delegations/route.ts:10`, `src/app/api/delegations/[id]/route.ts:13`, `src/lib/workflow-engine/delegation.ts:113`, `src/lib/workflow-engine/delegation.ts:91` |

#### Summary

The delegation APIs trust caller-controlled identifiers for both listing and revocation. An authenticated employee can inspect another user’s approval delegations and can disable a delegation record if they know its numeric id.

#### Validation

- Method: static route-to-service review
- Evidence:
  - The list route accepts `userId` from the query string and forwards it into `listDelegations(...)`.
  - The service expands that into both `fromUser` and `toUser` matches, so the caller can enumerate another person’s delegation relationships.
  - The delete route revokes by id only, and the service updates the matching row to `INACTIVE` without verifying ownership or privilege.
- Remaining uncertainty: delegation id discovery may require enumeration or guesswork, but the API surface itself is clearly unauthorized.

#### Dataflow

Authenticated request -> `/api/delegations?userId=<victim>` or `/api/delegations/[id]` -> delegation service -> direct database query or update on another user’s record.

#### Reachability

Any signed-in employee can trigger these paths. The likely outcomes are privacy exposure of approval-routing relationships and disruption of someone else’s active delegation window, which can interfere with legitimate approvals.

#### Severity

Medium. The issue clearly crosses user boundaries and can disrupt workflow operations, but it does not by itself grant approval authority or infrastructure access. Severity would rise if delegation state were automatically trusted for privileged approvals without any secondary checks, and would fall if route-level privilege gating outside this repository conclusively limited access.

#### Remediation

- Restrict delegation listing to the current user unless the caller has explicit workflow-admin rights.
- Require ownership or privileged role checks before revoking a delegation.
- Return opaque identifiers rather than predictable numeric ids where feasible.
- Add tests for cross-user delegation reads and deletes.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/proxy.ts`, `auth.config.ts`, `auth.ts`, `src/lib/dev-session.ts` | Session and authentication boundary | No issue found | Main route protection and session handling are broadly present and consistent with the repository security model. |
| `src/app/api/approvals/**`, `src/lib/workflow-engine/approval.ts` | Authorization bypass / workflow integrity | Reported | Approval request reads and writes are insufficiently scoped to owners and approvers. |
| `src/app/api/workflows/**`, `src/app/api/escalation-rules/route.ts`, `src/lib/workflow-engine/{workflow,escalation}.ts` | Admin policy tampering | Reported | Workflow definitions and escalation rules are mutable by any authenticated employee. |
| `src/app/api/delegations/**`, `src/lib/workflow-engine/delegation.ts` | IDOR / state tampering | Reported | Delegation data can be enumerated or revoked across users. |
| `scripts/db-copy-prod-to-dev.mjs` | Secret handling | Reported | Contains live credentials for SSH and database access. |
| `src/app/api/import/route.ts`, `src/app/api/ocr/business-card/route.ts`, `src/lib/card-parser.ts`, `src/lib/crm-service.ts` | Untrusted file and image handling | Needs follow-up | No direct exploit survived the source review, but these remain worthwhile parser and fuzzing surfaces. |
| Targeted grep across `src/**` and `scripts/**` | Raw query, command execution, and template sinks | No issue found | No runtime raw-query sink surfaced; the main command sink reviewed was the reported credentialed helper script. |

## Open Questions And Follow Up

- Review the import pipeline in `src/app/api/import/route.ts` with a file-format and spreadsheet-parser focus, especially around untrusted workbook content and row-to-model coercion.
- Review `src/app/api/ocr/business-card/route.ts` and `src/lib/card-parser.ts` for denial-of-service behavior under extremely malformed OCR payloads or very large text extraction results.
- Review the remaining organization and settings admin routes under `src/app/api/settings/**` and `src/app/api/admin/**` to confirm the newer permission model is consistently enforced server-side.
- Re-run this scan after removing or rotating the credentials in `scripts/db-copy-prod-to-dev.mjs`, because that single issue currently dominates operational risk.
