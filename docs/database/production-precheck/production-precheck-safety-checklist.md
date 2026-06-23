# Production Pre-Check Safety Checklist

> Run through this checklist **before** running
> [`production-readonly-precheck.sql`](production-readonly-precheck.sql) against production, and
> again **after**, before sharing any output. Every item should be checked off — if any item
> can't be confirmed, stop and resolve it before proceeding.

## Before running

- [ ] **Confirm production database identity.** You have independently verified — through hPanel,
      a known-good server config, or direct knowledge of this project's Hostinger account — that
      the database you are about to connect to is genuinely production, not dev
      (`u686730471_caveodev`), not UAT, and not an unrelated/decommissioned database.
- [ ] **Confirm the connecting user has read-only or limited permissions, if possible.** If a
      dedicated read-only MySQL user exists for production, use it instead of an
      admin/full-privilege account. If only a full-privilege account is available, proceed with
      extra care — the SQL file itself contains no write statements, but a privileged session
      makes a typo more dangerous.
- [ ] **Confirm a backup is NOT being taken in this step.** This pre-check is read-only by
      design and does not require, and should not be combined with, a backup operation — keep
      this step scoped to information-gathering only.
- [ ] **Confirm no write statements exist in the SQL file.** Open
      [`production-readonly-precheck.sql`](production-readonly-precheck.sql) and confirm, by
      reading it yourself (do not just trust this checklist), that it contains no `INSERT`,
      `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE`, `REPLACE`, `RENAME`, `GRANT`,
      `REVOKE`, or `SET FOREIGN_KEY_CHECKS` statement. A quick way to double-check:
      ```bash
      grep -iE "INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|REPLACE|RENAME|GRANT|REVOKE|FOREIGN_KEY_CHECKS" production-readonly-precheck.sql
      ```
      This should return no matches, or only matches that are either (a) inside a comment line
      starting with `--` (harmless commentary, not an executable statement), or (b) a column
      *name* from `INFORMATION_SCHEMA` itself — e.g. `CREATE_TIME`/`UPDATE_TIME` in Section 0's
      table-discovery query are real, read-only `INFORMATION_SCHEMA.TABLES` columns, not write
      statements. Read each match yourself to confirm which case it is — don't assume.
- [ ] **Confirm only `SELECT`/`SHOW`/`INFORMATION_SCHEMA` queries are present.** Every statement
      in the file should start with `SELECT` (including `SELECT ... FROM INFORMATION_SCHEMA...`)
      or `SHOW`. There is no other statement type in this file as of Step 3Y (2026-06-23).
- [ ] **Confirm no migration command is part of this step.** You are not about to run
      `prisma migrate deploy`, `prisma migrate resolve`, or any hand-written `ALTER TABLE`/
      `UPDATE` alongside this check. This is a separate, later, explicitly-approved step — not
      this one.
- [ ] **Confirm `db push` is not being run.** Same reasoning as above — this check has nothing to
      do with `prisma db push`, and `db push` should never be used against production at any
      point in this project's workflow.

## While running

- [ ] **Confirm the password is never typed on the command line in a way that lands in shell
      history.** Use `--password` with no value immediately after it (prompts interactively) or
      `-p` (also prompts), not `--password=<value>` inline.
- [ ] **Confirm command output does not include passwords.** None of the queries in this file
      select from any credentials table or environment — but double-check your terminal's own
      command echo doesn't include a password you typed elsewhere in the same session.

## After running

- [ ] **Confirm output is sanitized before sharing.** Read the raw output file yourself first.
      Remove or redact anything that looks like a hostname, username, password, or connection
      string before pasting any of it elsewhere — even though the queries themselves don't select
      such values, always verify the actual output, not just the query text.
- [ ] **Confirm the sanitized findings are transcribed into
      [`production-precheck-result-template.md`](production-precheck-result-template.md)**, not
      shared as raw terminal output.
- [ ] **Confirm no row, table, or schema object was modified.** If you want extra assurance, run
      a final read-only row-count check on one or two tables you queried and confirm the counts
      match what they were before you started (they should be identical, since nothing in this
      pack writes anything).
