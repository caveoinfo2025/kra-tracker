# Validation Summary

| Candidate | Result | Notes |
| --- | --- | --- |
| `cand-001-hardcoded-live-infra-credentials` | survives | Direct plaintext credentials committed in an operational script. |
| `cand-002-approval-request-idor-and-arbitrary-actions` | survives | Approval request visibility and state mutation lack ownership or approver checks. |
| `cand-003-workflow-definition-and-escalation-tampering` | survives | Workflow-admin mutations require only authentication. |
| `cand-004-delegation-idor-and-arbitrary-revocation` | survives | Delegation listing and revocation are missing object-level authorization. |
