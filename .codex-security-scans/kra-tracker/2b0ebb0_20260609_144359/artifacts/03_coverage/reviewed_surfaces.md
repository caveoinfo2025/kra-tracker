# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Auth and session gate | Missing auth / session bypass | No issue found | `src/proxy.ts` and `auth.config.ts` enforce a consistent authenticated boundary for most routes. |
| Approval request APIs | Authorization bypass / IDOR | Reported | Authenticated users can enumerate approval requests and mutate approval state without being eligible approvers. |
| Workflow definition APIs | Protected admin mutation | Reported | Workflow creation and updates are not restricted beyond basic authentication. |
| Escalation rule APIs | Protected admin mutation | Reported | Authenticated users can create escalation rules, including auto-approve and auto-reject actions. |
| Delegation APIs | IDOR / denial of service | Reported | Delegation records are visible and revocable across users without ownership checks. |
| Import and OCR surfaces | Untrusted parsing | Needs follow-up | No immediate source-level exploit survived review, but these are still worthwhile fuzzing targets. |
| Operational scripts | Hardcoded secrets | Reported | Newly added database-copy helper embeds live infrastructure credentials. |
