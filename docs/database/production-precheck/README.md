# Production Read-Only Pre-Check Pack

> **Step 3Y (2026-06-23).** This pack was created entirely from this local dev environment —
> **no production database was connected to, queried, or modified to produce it.** Every file
> here is a static artifact (SQL text, a checklist, a result template) meant to be carried to
> and run by someone who already has confirmed production access. Nothing in this folder
> executes anything on its own.

## Purpose

Step 3X (the automated pre-check dry run) found that this dev environment has no confirmed,
safely-usable production database credential, and stopped rather than guess at one. This pack
exists so a **human with confirmed production access** can run the exact same read-only checks
directly against production, without ever having to paste a production connection string or
password into a chat session with an AI assistant.

The output feeds directly into
[`docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`](../PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md) —
specifically, it replaces that document's "Needs verification" rows with real findings.

## Who should run this

Someone who:

- Already has confirmed, authorized access to the **production** Caveo CRM database (not dev,
  not UAT) — e.g. via the Hostinger hPanel database tools, an authorized Remote MySQL
  connection, or a direct SSH session to the production server.
- Can run `mysql` (or an equivalent read-only client) against that database directly.
- Understands this is a **read-only** exercise — every statement in
  [`production-readonly-precheck.sql`](production-readonly-precheck.sql) is a `SELECT`, `SHOW`,
  or `INFORMATION_SCHEMA` query (see
  [`production-precheck-safety-checklist.md`](production-precheck-safety-checklist.md) to verify
  this yourself before running anything).

## Where to run it

- **On the production server itself**, or via a confirmed, authorized Remote MySQL connection
  from a trusted machine — never by typing or pasting the production `DATABASE_URL` into an AI
  chat session, a shared document, or any channel that isn't already access-controlled the same
  way the production database itself is.
- **Not from this local dev repo's `.env`** — that file is confirmed to point at the dev database
  (`u686730471_caveodev`), not production.
- **Not using `.env.hostinger`** — that file exists locally but is not documented anywhere as
  the live production configuration; do not assume it is correct without separately confirming
  it against the actual production environment.

## What NOT to do

- Do **not** run any migration command (`prisma migrate deploy`, `prisma migrate resolve`,
  `prisma db push`, or any hand-written `ALTER TABLE`/`UPDATE`) as part of this check — this pack
  is read-only by design, and so is every query in it.
- Do **not** modify any row, table, or schema object.
- Do **not** deploy any application code as part of running this check.
- Do **not** paste the production `DATABASE_URL`, password, or full connection string into chat,
  into this repo, or into any other shared/logged channel.
- Do **not** share raw, unreviewed terminal output — sanitize it first (see below).

## How to capture sanitized results

1. Run [`production-readonly-precheck.sql`](production-readonly-precheck.sql) against production
   and redirect the output to a local text file (examples below).
2. **Review that output yourself first.** Confirm it contains no hostname, username, password, or
   anything else you wouldn't want recorded outside the production environment itself — the
   queries in this file are designed not to select any of that, but always check the actual
   output before sharing it.
3. Transcribe the relevant numbers into
   [`production-precheck-result-template.md`](production-precheck-result-template.md) — that
   template is the thing meant to be shared back, not the raw SQL client output.
4. If anything in the raw output looks sensitive or you're unsure, leave it out of the shared
   template and just describe the finding in words (e.g. "production DB confirmed reachable,
   details withheld").

## Example commands (no real credentials — fill in your own)

Using the MySQL CLI directly on the production server or via an authorized Remote MySQL
connection:

```bash
mysql --host=<prod-host> --user=<prod-readonly-user> --password <prod-db-name> \
  < production-readonly-precheck.sql > production-precheck-output.txt
```

(`--password` with no value immediately after it prompts interactively — it does not put the
password on the command line or in shell history.)

Or, if you prefer to be prompted for the password separately and pipe through `less` to review
before saving:

```bash
mysql --host=<prod-host> --user=<prod-readonly-user> -p <prod-db-name> \
  < production-readonly-precheck.sql | less
```

Do not substitute a real host, user, or database name into this README — keep those only in
your own terminal session or a secrets manager, never committed to this repo.

## After running

Once you have sanitized output, fill in
[`production-precheck-result-template.md`](production-precheck-result-template.md) and return it
to whoever is coordinating the production migration sign-off — that document, not the raw SQL
output, is what gets folded back into
[`PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`](../PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md).
