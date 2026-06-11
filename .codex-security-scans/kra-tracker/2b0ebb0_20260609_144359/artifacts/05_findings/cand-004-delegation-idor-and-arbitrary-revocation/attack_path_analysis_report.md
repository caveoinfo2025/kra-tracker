# Attack Path: cand-004-delegation-idor-and-arbitrary-revocation

- Reachability: any authenticated employee can enumerate another user's delegations if they know or guess an employee id, then revoke a delegation if they know or guess the delegation id.
- Consequence:
  - Exposes internal workflow staffing and delegation details.
  - Lets an attacker disrupt approval routing by disabling active delegations.
- Severity rationale: medium. The issue directly crosses user boundaries and can disrupt approvals, but it does not by itself grant approval rights or broader infrastructure access.
