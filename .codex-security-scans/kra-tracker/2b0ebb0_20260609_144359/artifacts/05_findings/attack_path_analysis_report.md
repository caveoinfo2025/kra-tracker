# Attack Path Analysis Summary

| Candidate | Severity | Confidence | Summary |
| --- | --- | --- | --- |
| `cand-001-hardcoded-live-infra-credentials` | critical | high | Exposes live SSH and DB credentials directly from source. |
| `cand-002-approval-request-idor-and-arbitrary-actions` | high | high | Any authenticated user can view and drive approval state transitions for requests they do not own. |
| `cand-003-workflow-definition-and-escalation-tampering` | high | high | Any authenticated user can alter shared approval-policy configuration and escalation behaviors. |
| `cand-004-delegation-idor-and-arbitrary-revocation` | medium | high | Any authenticated user can inspect or disable other users' delegation records. |
