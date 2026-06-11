# Validation: cand-001-hardcoded-live-infra-credentials

- Method: direct source inspection
- Result: survives
- Evidence:
  - `scripts/db-copy-prod-to-dev.mjs:11-14` hardcodes SSH host, username, and password.
  - `scripts/db-copy-prod-to-dev.mjs:21-23` hardcodes development database name, user, and password.
  - The same secrets are then used in `mysqldump` and `mysql` command invocations.
- Counterevidence checked:
  - No secret-loading wrapper or environment indirection is present in this script.
  - The file is untracked in Git status but present in the repository working tree and therefore in scan scope.
