# Attack Path: cand-001-hardcoded-live-infra-credentials

- Reachability: any party that can read the repository checkout, a copied workspace, logs, or backups can recover the plaintext credentials.
- Consequence:
  - SSH access to the production host can be attempted directly with the embedded username and password.
  - The helper also reveals development database credentials and a production environment path that simplifies follow-on compromise.
- Severity rationale: critical. The issue exposes reusable live secrets for privileged infrastructure access with no further application-layer exploit required.
