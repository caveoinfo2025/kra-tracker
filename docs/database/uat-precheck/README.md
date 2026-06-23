# UAT Read-Only Pre-Check Pack

> **Step 3Z (2026-06-23).** This pack was created entirely from this local dev environment —
> **no UAT database was connected to, queried, or modified to produce it.** Every file here is a
> static artifact (SQL text, a checklist, a result template) meant to be carried to and run by
> someone who already has confirmed UAT access. Nothing in this folder executes anything on its
> own. This pack targets **UAT only** — never point it at production.

## Purpose

Production deployment is paused; the next deployment target is **UAT** (see
[`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`](../UAT_DECIMAL_INR_MIGRATION_PLAN.md)). This
pack exists so a **human with confirmed UAT access** can run the same kind of read-only checks
used for the (still-unrun) production pack, but against UAT, before any UAT migration is
executed.

The output feeds directly into §3 ("UAT Pre-Checks") of
[`UAT_DECIMAL_INR_MIGRATION_PLAN.md`](../UAT_DECIMAL_INR_MIGRATION_PLAN.md) — it replaces that
section's checklist items with real findings.

This pack is adapted from
[`docs/database/production-precheck/`](../production-precheck/), with every identifier and
caution relabelled for UAT. **Do not reuse production credentials with this pack, and do not run
this pack's queries against production** — see "Where to run it" below.

## Who should run this

Someone who:

- Already has confirmed, authorized access to the **UAT** Caveo CRM database
  (`u686730471_Caveo_UAT`, connecting user `u686730471_caveouat` — per
  `docs/CHANGELOG.md`/`docs/NEXT_SESSION.md` Session 9, 2026-06-19, **not independently
  re-verified by this step**) — not dev, not production.
- Can run `mysql` (or an equivalent read-only client) against that database directly.
- Understands this is a **read-only** exercise — every statement in
  [`uat-readonly-precheck.sql`](uat-readonly-precheck.sql) is a `SELECT`, `SHOW`, or
  `INFORMATION_SCHEMA` query (see
  [`uat-precheck-safety-checklist.md`](uat-precheck-safety-checklist.md) to verify this yourself
  before running anything).

## Where to run it

- **On the UAT server itself**, or via a confirmed, authorized Remote MySQL connection from a
  trusted machine — never by typing or pasting the UAT `DATABASE_URL` into an AI chat session, a
  shared document, or any channel that isn't already access-controlled the same way the UAT
  database itself is.
- **Not from this local dev repo's `.env`** — that file is confirmed to point at the dev database
  (`u686730471_caveodev`), not UAT.
- **Not using `.env.hostinger`** — that file exists locally but is not documented anywhere as the
  UAT (or production) configuration; do not assume it is correct without separately confirming it
  against the actual UAT environment.
- **Never against production.** The real UAT environment file lives only on the remote UAT
  server (`.../domains/uat.caveoinfosystems.com/public_html/.builds/config/.env`, per
  `.env.uat.example`'s own header comment) — confirm you are pointed at that database, not
  `u686730471_caveo_crm` (the documented production database name), before running anything.

## What NOT to do

- Do **not** run any migration command (`prisma migrate deploy`, `prisma migrate resolve`,
  `prisma db push`, or any hand-written `ALTER TABLE`/`UPDATE`) as part of this check — this pack
  is read-only by design, and so is every query in it.
- Do **not** modify any row, table, or schema object.
- Do **not** deploy any application code as part of running this check.
- Do **not** use production credentials with this pack, and do not run this pack against
  production.
- Do **not** paste the UAT `DATABASE_URL`, password, or full connection string into chat, into
  this repo, or into any other shared/logged channel.
- Do **not** share raw, unreviewed terminal output — sanitize it first (see below).

## How to capture sanitized results

1. Run [`uat-readonly-precheck.sql`](uat-readonly-precheck.sql) against UAT and redirect the
   output to a local text file (examples below).
2. **Review that output yourself first.** Confirm it contains no hostname, username, password, or
   anything else you wouldn't want recorded outside the UAT environment itself — the queries in
   this file are designed not to select any of that, but always check the actual output before
   sharing it.
3. Transcribe the relevant numbers into
   [`uat-precheck-result-template.md`](uat-precheck-result-template.md) — that template is the
   thing meant to be shared back, not the raw SQL client output.
4. If anything in the raw output looks sensitive or you're unsure, leave it out of the shared
   template and just describe the finding in words (e.g. "UAT DB confirmed reachable, details
   withheld").

## Example commands (no real credentials — fill in your own)

Using the MySQL CLI directly on the UAT server or via an authorized Remote MySQL connection:

```bash
mysql --host=<uat-host> --user=<uat-readonly-user> --password <uat-db-name> \
  < uat-readonly-precheck.sql > uat-precheck-output.txt
```

(`--password` with no value immediately after it prompts interactively — it does not put the
password on the command line or in shell history.)

Or, if you prefer to be prompted for the password separately and pipe through `less` to review
before saving:

```bash
mysql --host=<uat-host> --user=<uat-readonly-user> -p <uat-db-name> \
  < uat-readonly-precheck.sql | less
```

Do not substitute a real host, user, or database name into this README — keep those only in your
own terminal session or a secrets manager, never committed to this repo.

## After running

Once you have sanitized output, fill in
[`uat-precheck-result-template.md`](uat-precheck-result-template.md) and return it to whoever is
coordinating the UAT migration — that document, not the raw SQL output, is what gets folded back
into
[`UAT_DECIMAL_INR_MIGRATION_PLAN.md`](../UAT_DECIMAL_INR_MIGRATION_PLAN.md) §3.
