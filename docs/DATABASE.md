# Database

**Engine:** **MySQL / MariaDB 11.8** (migrated from SQLite 2026-06-02) · **ORM:** Prisma 7.8
(driver-adapter mode, `@prisma/adapter-mariadb`) · **Schema:** `prisma/schema.prisma`
(`provider="mysql"`) · **Client output:** `src/generated/prisma` ·
**60+ models, 10 migrations.** Dev DB fully migrated (2026-06-05, session 4).

> **Canonical money unit policy (locked, Step 3U-0, 2026-06-22): canonical storage/input is
> actual INR. Lakhs is a display/reporting unit only** — applies to every business model
> (Finance, Payment, Collection, Lead, Funnel, Opportunity, KRA targets, Sales targets, report
> source data). Dashboards/KRA views/reports may convert INR to Lakhs at the presentation
> boundary only, never the reverse. See `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §16/§19
> and `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md` for the full locked decision and its
> migration scope.
>
> **Decimal money migration — Release 1 implemented (Step 3Q, 2026-06-22).** Every money-like
> `Float`/`Float?` field across Finance (`Collection`, `Payment`, `Expense`, `Voucher`, `Ledger`,
> `EmployeeAdvance`, `TravelClaim`, `FinAccount`, etc.) was inventoried in
> `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` (Step 3G). The central Decimal-safe
> parsing/serialization/arithmetic helper — `src/lib/money.ts` (Step 3H) — is wired into every
> Finance read route. **Money unit policy locked (2026-06-22): only CRM Lead/Opportunity/
> pipeline-estimate fields may use Lakhs — every Finance/Accounting field must store actual
> INR.** ~~See `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` §0 for the full field-by-field
> verification.~~ **CORRECTED (Step 3T-1, 2026-06-22): the CRM Lead/Opportunity Lakhs exception
> above is superseded — all persisted business money values (Leads, Funnel, Opportunities, KRA
> targets, Finance, Payment, Collection) must now be actual INR; Lakhs is allowed only as a
> sales dashboard/KRA/report display unit.** See
> `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §15–§19 for the corrected policy (now locked
> to Option A as of Step 3U-0) and its Release 2 impact, and
> `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` §0 for the superseded field-by-field
> verification plus its Step 3T-1 correction note.
>
> **Release 1 — `Expense`, `EmployeeAdvance`, `TravelClaim` (9 fields) — is DONE on the dev DB
> (`u686730471_caveodev`) as of Step 3Q.** `amountLakhs`/`gstAmountLakhs`/
> `disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs` are now `Decimal(18,2)` storing
> actual ₹ INR (converted via `× 100,000` on every existing row); `TravelClaim.amountRupees`/
> `ratePerKm` are now `Decimal(18,2)`/`Decimal(10,4)` with no value change (already real
> INR/real ₹-per-km). Field names still say "Lakhs" — the rename is deferred. Migration:
> `prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/`. API boundaries
> (`/api/finance/expenses`, `/api/finance/expenses/[id]`, `/api/finance/advances`,
> `/api/finance/conveyance`, `/api/finance/dashboard`) and UI converters
> (`ExpenseRegisterClient.tsx`, `ClaimsClient.tsx`, `AdvancesClient.tsx`,
> `FinanceApprovalsClient.tsx`, `FinanceDashboardClient.tsx`) were updated in the same release.
> Full results: `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md` (11/11 verification checks
> pass). **Production has NOT been migrated** — this applies to dev only.
>
> **Step 3R (2026-06-22) post-migration audit confirms Release 1 end-to-end.** Independently
> re-verified column types (`INFORMATION_SCHEMA`), live API responses, and live UI rendering on
> the dev DB — all correct, no Decimal-object leakage, no 100,000× inflation, no leftover Lakhs
> labeling. `Payment`/`Collection`/`Voucher`/`Ledger` reconfirmed still `double`. No blockers or
> functional bugs found; one pre-existing, unrelated migration-history gap (two earlier
> migrations missing from `_prisma_migrations`) was documented but not fixed (out of scope).
>
> **Release 2 — `Payment`/`Collection` (4 fields) — remains explicitly BLOCKED**, pending
> sign-off on the `src/lib/kra-engine.ts` scoring-boundary conversion (`Collection` feeds KRA
> billing targets, ~~which stay Lakhs-based by design~~ **— Step 3T-1 correction: KRA targets
> should also move to actual INR via a separate Sales/KRA target migration, not stay Lakhs
> permanently**). See the readiness check's §12 sign-off table,
> `docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md` §11, and
> `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §15–§19 for the full corrected decision
> ledger. `Voucher`/`Ledger`/`FinAccount` are untouched by Release 1/2 and remain ₹ Lakhs; CRM
> Lead/Opportunity/KRA target values are untouched by Release 1 but are now in scope for a
> future actual-INR migration (Option A, locked Step 3U-0) — see
> `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md` for the full migration scope, not exempt.
>
> **Combined Release 2 scope locked (Step 3U-1, 2026-06-22) — sign-off only, nothing implemented.**
> `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` is now the authoritative Release 2
> field list: `Payment.amountLakhs`; `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
> `amountReceivedLakhs`; `CrmLead.expectedValue`; `CrmOpportunity.value`/`dealValueExTax`/
> `netProfitLakhs`; `SalesFunnel.dealValueLakhs`/`billingValueLakhs`;
> `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` (REVENUE-metric rows only);
> legacy `KRA.target` (confirmed-money entries only); `EmployeeTarget`/`TeamTarget.targetJson`
> (review-only). All five domains must ship as **one atomic release** — Payment/Collection cannot
> convert independently of the Sales/KRA target migration without an explicitly-approved Option B
> emergency bridge.
>
> **Section 9 open decisions closed via live-DB scan (Step 3U-2, 2026-06-22) — sign-off only,
> nothing implemented.** `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §12 records a
> read-only scan against `u686730471_caveodev`. **Correction:** the live `KRAMetric.metricType`
> enum is `AMOUNT`/`PERCENTAGE`/`COUNT` — `prisma/seed-performance-defaults.ts`'s `REVENUE`-typed
> rows don't exist in the dev DB. Money metrics are confirmed as the `AMOUNT`-typed ones
> (`BOOKING`/`BILLING`, plus an unused `FUNNEL_VALUE`). **One `KRATemplateItem` row (#16) is
> Blocked/Manual Review** — a `targetType`/metric-`metricType` mismatch with money-scale values.
> All 34 `KRA.target` rows and 34 `EmployeeTarget.targetJson` rows parsed cleanly (6 confirmed
> money KPI labels; `targetJson` confirmed to store the same free-text format as `KRA.target`,
> not real JSON); `TeamTarget` has 0 rows. Lead/Opportunity/Funnel fields confirmed Lakhs-scaled,
> zero negatives, across 38/21/100 live rows. `OrderAdvance` (0 rows) is included in locked scope
> anyway to remove a future lockstep-unit-mismatch risk. Named business sign-off recorded (actual
> INR for Lead/Funnel/Opportunity input/storage; Lakhs for Sales dashboard/KRA/Report display).
> **Release 2 implementation permission: Blocked, narrowly, on the single `KRATemplateItem` #16
> ambiguity only** — every other Section 9 decision is now closed.
>
> **`KRATemplateItem` #16 decision recorded (Step 3U-3, 2026-06-22) — sign-off only, nothing
> implemented.** Product owner selected **Option B — configuration error, fix before
> migration** (`docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §13, direct
> confirmation in conversation, not assumed). Item #16 does **not** convert in this Release 2
> pass; before Step 3U starts, its `metricId` must be re-linked to a genuine `AMOUNT`-typed
> metric. **Release 2 implementation permission remains Blocked** — no longer on a
> classification ambiguity, but on this concrete, not-yet-performed config-correction
> prerequisite. Every other Release 2 scope item is Approved.
>
> **Correction attempted, not performed (Step 3U-4, 2026-06-22).** Live re-inspection confirmed
> **no existing `AMOUNT` metric matches item #16** — the previously-suggested `FUNNEL_VALUE` was
> checked and ruled out (it's an individual rep's funnel-creation metric; item #16 is a
> manager's team-pipeline-coverage target, a different concept, confirmed directly by the
> business owner). A new `KRAMetric` is needed. Two creation paths were offered: the admin UI
> (found infeasible — `KRALibrary.tsx`'s `metricType` dropdown doesn't offer `AMOUNT`, a
> separate out-of-scope UI gap) and a guarded dev-DB script (explicitly declined by the product
> owner). **No correction was made — Release 2 implementation permission remains Blocked** on
> this precisely-scoped, not-yet-authorized prerequisite
> (`docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §14).
>
> **Resolved (Step 3U-5, 2026-06-23).** `KRALibrary.tsx`'s `metricType` dropdown fixed to offer
> `AMOUNT`/`PERCENTAGE`/`COUNT` (the taxonomy every live `KRAMetric` row actually uses, default
> `AMOUNT`); a new single-item update path was added (`updateKRATemplateItem()` in
> `src/lib/performance-engine/templates.ts` + `PATCH /api/admin/performance/templates/items`)
> since the existing template-level `PATCH` route deletes/recreates every item in a template. A
> new `KRAMetric` ("Team Pipeline Coverage", `TEAM_PIPELINE_COVERAGE`, `metricType = AMOUNT`,
> `id = 16`) was created via `createKRAMetric()`, and `KRATemplateItem` #16's `metricId` was
> re-linked from 9 (`PIPELINE_RATIO`, `PERCENTAGE`) to 16 — `targetType`/target values/all other
> fields and every sibling row unchanged (verified). **Release 2 implementation permission:
> Approved for dev implementation only** — no Release 2 migration was implemented; see
> `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §15.
>
> **Release 2 IMPLEMENTED on the dev DB (Step 3U, 2026-06-23).** All 10 fields now `Decimal(18,2)`
> storing actual ₹ INR: `Payment.amountLakhs`; `Collection.invoiceValueLakhs`/
> `amountWithoutGstLakhs`/`amountReceivedLakhs`; `OrderAdvance.amountLakhs`;
> `CrmLead.expectedValue`; `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`;
> `SalesFunnel.dealValueLakhs`/`billingValueLakhs`. Field names still say "Lakhs" (rename
> deferred). `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` stayed `Float`
> (shared across `AMOUNT`/`PERCENTAGE`/`COUNT` rows) — only the 3 `AMOUNT`-typed rows' *data* was
> multiplied by 100000. The 8 confirmed-money `KRA.target`/`EmployeeTarget.targetJson` entries
> were also multiplied in place; every other label byte-identical. Migration:
> `prisma/migrations/20260623060000_decimal_release2_combined_inr_canonical/`. `kra-engine.ts`/
> `payments.ts` rewritten on top of `money.ts`; ~15 API routes updated to parse via
> `parseMoneyInput()` and guard responses via `moneyToNumberForDisplay()`/
> `inrToLakhsEquivalent()`; Sales/CRM UI forms relabelled `"...(₹L)"` → `"...(₹)"` (real INR);
> dashboards/KRA views/reports/mobile screens keep Lakhs display via `inrToLakhsEquivalent()`,
> per the recorded business sign-off. Full results, before/after verification, and KRA-scoring
> stability check: `docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md`. **Production has NOT
> been migrated** — this applies to dev only. `Voucher`/`Ledger`/`FinAccount`/`Expense`/
> `EmployeeAdvance`/`TravelClaim` and non-`AMOUNT` `KRATemplateItem` rows confirmed unchanged.
>
> **Production migration sign-off plan created (Step 3W, 2026-06-23) — planning only, nothing
> executed.** `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` documents that
> production's `_prisma_migrations` holds only a single baseline row from the 2026-06-02
> SQLite→MySQL cutover (no subsequent production migrate-deploy event is documented anywhere),
> and that `master` (production's branch) is 78 commits behind `uat`. The real production gap is
> very likely the entire post-baseline migration history, not just the two Decimal releases.
> Every production-state claim in that document is marked "Needs verification." Go/No-Go and
> sign-off ledgers are both Pending — no production execution is authorized.
>
> **Production pre-check dry run attempted (Step 3X, 2026-06-23) — blocked on DB access, nothing
> executed.** No confirmed, safely-usable production `DATABASE_URL` was available in that session
> (local `.env` points at dev; `.env.hostinger` is not documented anywhere as the live production
> config) — DB-dependent checks (identity, `_prisma_migrations`, schema, row counts, unit
> sampling, KRA/Sales target classification) remain "Needs verification," explicitly blocked, not
> guessed. What git history alone confirmed: `master` is 79 commits behind `uat`, `master`'s
> migration folder is missing 7 migrations including both Decimal releases, `src/lib/money.ts`
> doesn't exist on `master`, and `master`'s schema still has every Release 1/2 field as `Float`.
> Full record: `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`.
>
> **Human-run production read-only pre-check pack created (Step 3Y, 2026-06-23) — no production
> connection used.** `docs/database/production-precheck/` now holds a self-contained pack
> (README, a read-only SQL file using the real `@@map`-resolved physical table names, a result
> template, a safety checklist, and an optional guarded script) for a human with confirmed
> production access to run directly. Every SQL statement is `SELECT`/`SHOW`/`INFORMATION_SCHEMA`
> only. Production migration readiness is unchanged — still blocked pending those results.
>
> **Deployment strategy changed to UAT-first (Step 3Z, 2026-06-23) — production migration
> paused.** New flow: dev (done) → UAT migration + testing → UAT sign-off → production planning
> resumes → production migration only after approval. See
> `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` and `docs/database/uat-precheck/` for the
> UAT-scoped plan and read-only pre-check pack (UAT identifiers only, never production
> credentials). The production sign-off plan above remains valid background, not withdrawn — it
> simply isn't the next active step.
>
> **UAT pre-check dry run attempted, blocked (Step 4A, 2026-06-23).** This dev environment has
> no confirmed, externally-reachable UAT database credential — `.env.uat.example`'s
> `DATABASE_URL` uses an unconfirmed/likely-stale user and a `127.0.0.1` host that only resolves
> on the UAT server itself. Every DB-dependent finding in
> `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s schema/row-count/unit/migration-history
> rows remains "Needs verification — blocked" until a human with confirmed UAT access runs
> `docs/database/uat-precheck/uat-readonly-precheck.sql` directly.
>
> **UAT pre-check actually run (Step 4B, 2026-06-24).** Confirmed clean: UAT's
> `_prisma_migrations` is missing exactly the 3 predicted migrations, and every in-scope Release
> 1/2 column is still Float/Text (no drift). **Two new blockers found:**
> `Payment`/`Collection`/`OrderAdvance` data on UAT samples at scales implausible as ₹ Lakhs
> (likely already actual ₹ INR — would be corrupted by the planned ×100,000 transform), and
> UAT's `KRA.target` free-text only contains 2 of dev's 6 documented money labels. See
> `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s "UAT Pre-Check Results — Confirmed Live
> Findings" section for full detail. UAT migration still not run.
>
> **UAT migration adjustment plan created (Step 4C, 2026-06-24).** Field-by-field decision matrix
> at `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`: `Payment`/`Collection`/
> `OrderAdvance` → type conversion only, no multiply (pending business sign-off);
> `CrmLead`/`SalesFunnel` → multiply by 100,000; `CrmOpportunity`'s 3 fields → blocked (negative
> value + all-zero ambiguity); `KRA.target` → only 2 of 6 dev labels confirmed on UAT so far, rest
> blocked pending full review. UAT migration remains blocked; planning only, no SQL written or
> run.
>
> **UAT classification blockers closed (Step 4D, 2026-06-24).** Business sign-off confirms
> `Payment`/`Collection`/`OrderAdvance` are already actual ₹ INR on UAT — type conversion only,
> approved. A full 49-row `CrmOpportunity` review confirms `value` is Lakhs-scale (1 negative row
> flagged as a data-quality artifact, not a unit blocker) and `dealValueExTax`/`netProfitLakhs`
> are exactly 0 across every row — all 3 fields approved for ×100,000. A full 34-row `KRA.target`
> review confirms all 6 of dev's documented money labels are present on UAT — dev's allowlist
> reused as-is. **UAT migration SQL generation permission: Approved** — drafting UAT-specific
> migration SQL is now unblocked, but running any migration still requires its own explicit
> instruction plus the remaining operational pre-checks.
>
> **UAT migration package generated (Step 4E, 2026-06-24).** Full reviewable SQL package at
> `docs/database/uat-migration-package/` — migration plan SQL (UAT-specific transform decisions
> baked in), pre/post read-only verification SQL, dry-run checklist, README, and 2 optional
> guarded Node scripts. SQL safety review confirmed clean (no destructive statements, no
> production reference, no Voucher/Ledger/FinAccount touched). **Migration not run** —
> operational approval and dry run review are the next step.
>
> **UAT operational approval checklist prepared/reviewed (Step 4F, 2026-06-24).** SQL/package
> readiness is fully Completed in `uat-migration-dry-run-checklist.md`. Two new records track
> what's still outstanding: `UAT_BACKUP_ROLLBACK_RECORD.md` (no real backup taken yet — all
> Pending) and `UAT_MIGRATION_APPROVAL_RECORD.md` (business/technical sign-off, write-freeze,
> rollback approval all Pending). **Migration execution permission: Pending. Migration not
> run.**
>
> **UAT backup risk exception recorded (Step 4F-1, 2026-06-24).** A real restore-to-scratch-DB
> test was attempted and found impossible in this environment (no `mysql`/`mariadb`/`docker`
> tooling). A structural sanity check of the backup file was done instead, and Vijesh Vijayan,
> named as approving owner, explicitly accepted the residual risk. Backup/rollback/final
> execution approval moved from Pending to **"Approved with risk exception."** Migration still
> not run.
>
> **UAT Decimal/INR migration EXECUTED (Step 4G, 2026-06-24).** Connected live to
> `u686730471_Caveo_UAT` (MariaDB `11.8.6-MariaDB-log`) and ran the full package:
> pre-migration snapshot (29/29 statements), migration SQL (36/36 statements), post-migration
> verification (27/27 statements) — **0 errors across all three.** Soft-delete fields added;
> `Payment`/`Collection`/`OrderAdvance` converted to `Decimal(18,2)` with no multiply (confirmed
> exact); `CrmLead`/`CrmOpportunity`/`SalesFunnel` converted and multiplied by exactly 100,000
> (confirmed exact, including the known row-42 anomaly). `Voucher`/`Ledger`/`FinAccount`
> confirmed untouched. **UAT's schema for these fields now matches dev's post-Release-2 state.**
> Two items remain open: the `KRA.target` free-text transform did not run (guarded script's
> execution path is still commented out — confirmed untouched via byte-identical diff), and
> `_prisma_migrations` was not updated (the 3 `migrate resolve` calls were blocked by this
> environment's safety classifier as a high-severity action). **Production untouched. Dev
> untouched.** Full results: `docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md`.
>
> **UAT KRA.target transform executed; migration history aligned (Step 4G-1, 2026-06-24).** Both
> Step 4G open items closed. Secret-hygiene check found and fixed an older, unrelated leaked
> credential in the tracked `.env.uat.example` (confirmed stale/inactive). The KRA transform
> script's execution path was finalized (default dry-run, transactional live write behind an
> explicit confirm flag) and run for real: 8 of 34 `KRA.target` rows updated, only the 6 approved
> money labels multiplied by 100,000, every non-money label byte-identical. `prisma migrate
> resolve --applied` then succeeded for all 3 target migrations — `_prisma_migrations` now shows
> 22 rows, all 3 present. Full re-verification (27/27 statements) confirmed everything else from
> Step 4G unchanged. **Migration execution permission: now fully exercised — both schema/data and
> bookkeeping are complete on UAT. Step 4H full functional testing (Finance, Sales, KRA) can
> begin.** Full results:
> `docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md` §13–§17.
>
> **UAT post-migration functional testing performed; Final Sign-Off Pending (Step 4H,
> 2026-06-24).** `uat.caveoinfosystems.com` is blocked by this environment's network policy —
> **no live UI/login testing was possible**, documented honestly rather than faked. Read-only
> UAT DB queries confirmed Finance/Sales/KRA data is all correct (no inflation/deflation/NULLs);
> static code review found one low-severity fallback-constant issue in `kra-engine.ts`.
> Sign-off: Finance/Sales/KRA = Passed with Minor Issues, RBAC = Pending (no live login
> possible), Technical Validation = Passed, **Final UAT Migration Sign-Off = Pending**. No
> Critical/High issue found in anything actually tested. Full results:
> `docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md`.

> **2026-06-10 (Session 6) — Phase 12 Integration Center + Phase 13 Security Center.**
> Two new migration blocks applied to `u686730471_caveodev` (uncommitted to git):
>
> **`20260610080000_integration_center`** — 5 tables:
> - `integration_provider` — `name, code(unique), category(EMAIL/GST/MAPS/WHATSAPP/SMS/WEBHOOK/ACCOUNTING/CALENDAR/ERP/CUSTOM), baseUrl?, status, configJson(@db.Text)`
> - `integration_connection` — `providerId→integration_provider, connectionName, authType, secretRef(env var NAME only), configJson(@db.Text), status, lastTestAt?, lastTestStatus, lastTestMessage?`
> - `integration_usage_rule` — `connectionId, module, resource, action, isEnabled, conditionJson?`
> - `integration_log` — `connectionId, eventType, status, requestSummary, responseCode?, durationMs?, errorMessage?, createdAt`
> - `api_key_reference` — `name, keyType(API_KEY/OAUTH_TOKEN/WEBHOOK_SECRET/BASIC_AUTH/BEARER_TOKEN/CUSTOM), environmentVariableName(unique), description?, isActive, createdAt, updatedAt`
>
> **Prisma model casing gotcha (Phase 12):** `APIKeyReference` → `prisma.aPIKeyReference` (Prisma lowercases the leading acronym).
>
> **`20260610090000_security_center`** — 7 tables:
> - `security_policy` — `policyType(unique), configJson(@db.Text), status, updatedAt`
> - `password_policy` — `minimumLength, requireUppercase, requireLowercase, requireNumber, requireSpecialCharacter, expiryDays, passwordHistoryCount, failedAttemptLimit, lockDurationMinutes, status`
> - `mfa_policy` — `enabled(BOOL), requiredRolesJson(@db.Text), methodsJson(@db.Text), rememberDeviceDays, status`
> - `session_policy` — `idleTimeoutMinutes, maxSessionHours, allowConcurrentLogin, maxConcurrentSessions, rememberMeAllowed, status`
> - `access_restriction_policy` — `ipRestrictionEnabled, allowedIpJson(@db.Text), businessHourRestriction, allowedHoursJson(@db.Text), locationRestrictionJson(@db.Text), status`
> - `data_protection_policy` — `exportLimit, exportApprovalRequired, downloadRestriction, sensitiveFieldsJson(@db.Text), maskingRulesJson(@db.Text), status`
> - `security_event_log` — `userId?, eventType, ipAddress?, userAgent?, details(@db.Text), severity, createdAt`. 14 event types: LOGIN_SUCCESS/FAILED, LOGOUT, PASSWORD_CHANGED, ROLE_CHANGED, EXPORT_REQUESTED/BLOCKED, ACCESS_DENIED, MFA_CHALLENGED/PASSED/FAILED, POLICY_CHANGED, SESSION_EXPIRED, ACCOUNT_LOCKED.
>
> **Prisma model casing gotcha (Phase 13):** `MFAPolicy` → `prisma.mFAPolicy`.
>
> **2026-06-05 (Session 4) — CRM Admin Engine + Opportunity close fields.** 4 new migrations
> applied to `u686730471_caveodev` (hand-written SQL → `node apply-*.mjs` → `migrate resolve`):
> - **`20260605000000_opportunity_discount_pct`** — `CrmOpportunity.discountPct DOUBLE DEFAULT 0`
>   (non-zero triggers the `DISCOUNT_APPROVAL` workflow).
> - **`20260605010000_crm_admin_engine`** — 7 tables: `pipeline_definition`, `pipeline_stage`,
>   `territory`, `territory_rule`, `account_assignment_rule`, `crm_automation_rule`, `sla_rule`
>   (all `@@map`-ped snake_case; `pipeline_stage.pipelineId`→`pipeline_definition` and
>   `territory_rule.territoryId`→`territory` are `ON DELETE CASCADE`).
> - **`20260605020000_opportunity_won_fields`** — `CrmOpportunity` + `dealValueExTax DOUBLE`,
>   `netMargin DOUBLE`, `poNumber VARCHAR(191)`, `poDate DATETIME(3) NULL`.
> - **`20260605030000_legacy_promote_and_net_profit`** — `CrmOpportunity.netMargin` **renamed** to
>   `netProfitLakhs` (absolute ₹L, not %); `SalesFunnel.crmOpportunityId INT NULL` (tracks legacy→
>   opportunity promotion; idempotency + funnel-hide key).
>
> **Prisma acronym casing (CRM-admin models):** accessors are `prisma.cRMAutomationRule` and
> `prisma.sLARule`; type imports are `CRMAutomationRuleModel` / `SLARuleModel` from
> `@/generated/prisma/models/<Name>`. `src/lib/crm-engine/` re-exports friendly aliases.

> **2026-06-05 (Session 3) — DB Migration applied.** All 4 pending Admin Console migrations are
> live on `u686730471_caveodev`. Admin Console Phase 2 (12 models), Policy Engine Phase 5 (6
> models), Workflow Engine Phase 6 (7 models), Master Data Phase 7 (8 models).

> **@@map pattern (Phases 6 & 7 only):** Migrations for workflow engine and master data used
> snake_case SQL table names (`workflow_definition`, `master_category`, etc.) while Prisma model
> names are PascalCase. `@@map("snake_case")` directives were added to all 15 affected models so
> Prisma resolves the correct table. Phases 2 & 5 used PascalCase in both SQL and model names —
> no @@map needed there. **`TeamTarget`/`KRATemplateItem`/`KRAMetric` are also `@@map`-ped**
> (`team_target`/`kra_template_item`/`kra_metric`) — a raw-SQL verification script that queries
> the PascalCase model name directly against these tables will fail with `ER_NO_SUCH_TABLE`
> (hit and resolved in Step 3V-1, `docs/RBAC_MIGRATION_TRACKER.md`). Prefer the Prisma client
> (`prisma.teamTarget.count()`) over raw SQL for ad-hoc dev-DB checks — it resolves `@@map`
> automatically.

> **Seed actor:** All Phase 5–7 seeds that reference an Employee FK (creator, performer) use
> `{ connect: { id: N } }` relation syntax (not bare FK integer) because Prisma 7 validates
> required relations at create time. The actor ID is resolved dynamically from `findFirst` or
> hardcoded to `2` (Vijesh Vijayan, first dev employee).

> **2026-06-04 (Session 1):** **No schema/migration/model changes this session.** Expense Categories,
> Vendor Master, and Customer Master are all **UI-only on mock data** (in each module's
> `data.ts`). No Prisma models added. **Architecture note — Customer Master:** the new global
> `/masters/customers` UI deliberately does **NOT** add a model — it extends the **existing**
> `Customer` model (`id/name/address/district/state/pincode/gstNo/officeType/parentId/branches/
> crmSource`). The enterprise fields shown in the UI (customerType, industry, sites with
> per-site GST, contacts, commercial, assets, profitability, documents) are the **target shape**
> for a future, additive migration on the existing `Customer` table + new child tables — not a
> parallel model. Likewise Vendor Master's UI shape targets the existing Phase-1 `Vendor` model.

> **2026-06-03:** **No schema/migration/model changes this session.** Finance Phase 2 was
> **UI-only on mock data** (`src/app/finance/**/data.ts`) — no Prisma changes. The mock shapes
> are the contract for the future finance APIs built against the existing Phase 1 models.
> See `docs/modules/finance/BANK_LEDGER_MAPPING.md` for the proposed (deferred) `Ledger`
> source-link columns.

> Money fields ending in `Lakhs` are ₹ Lakhs (`Float` → MySQL `DOUBLE`). Status/stage/role
> fields are free-form strings validated in app code, not DB enums. Long-text columns use
> `@db.Text` (avoid MySQL's default `VARCHAR(191)` truncation). Charset `utf8mb4_unicode_ci`.

> **Connection:** built in `src/lib/prisma.ts` from `DATABASE_URL` (host **`127.0.0.1`**, not
> `localhost`). Prisma 7 forbids `url` in `schema.prisma`, so it lives in `prisma.config.ts`.
> Hostinger/Passenger escapes `%`→`\%` in injected env — `prisma.ts` strips that before parsing.

## 1. Models

### People & performance
- **Employee** — `id, name, email(unique), department, role, isManager, msEmail?(unique),
  msId?(unique), createdAt, reportsToId?`. Org chart self-relation `reportsTo`/`reports`.
- **KRA** — `title, description, target, deadline, weight(=100), status(=active)`,
  `employeeId`. `target` = `"key:value;key:value"` parsed by the KRA engine.
- **WeeklyReview** — `week, year, progress, score, notes, blockers`, `employeeId, kraId`.
- **WeeklyCommit** — `week, year, commitText`, `employeeId, kraId` (forecast accuracy).
- **Certification** — `certName, issuingBody, dateObtained, expiryDate?, attachmentUrl,
  status(=pending), approvedBy?, approvedAt?`, `employeeId, kraId`.

### Activity sheets (feed the KRA engine)
- **LeadGeneration** — `date, territory, leadSource, customerName, contactPerson,
  phoneEmail, activityType, activityCount(=1), leadStatus(=New), qualifiedFlag,
  nextActionDate?, remarks`, `employeeId`.
- **SalesFunnel** — `opportunityId, createdDate, territory, customerName, solutionCategory,
  opportunityName, stage(=Lead), dealValueLakhs, billingValueLakhs, grossProfitPct,
  proposalDate?, expectedCloseDate?, poDate?, closedDate?, probabilityPct, status(=Active),
  newCustomerFlag, pocFlag, remarks`, `employeeId`. **`poDate` mandatory for Closed Won →
  mirrored into `closedDate`.**
- **Collection** — `invoiceDate, invoiceNo, customerName, invoiceValueLakhs,
  amountWithoutGstLakhs, dueDate, paymentReceivedDate?, amountReceivedLakhs (cached),
  collectionStatus(=Pending), remarks`, `employeeId`, `payments[]`.
- **DailyUpdate** — `date, topUpdates, keyMovement, blockers, topDealThisWeek,
  managerSupportRequired, updateStatus(=On Track)`, `employeeId`.

### Finance
- **Payment** — `collectionId, amountLakhs, paymentDate, mode(=Bank Transfer), referenceNo,
  notes, fromAdvanceId?, recordedById`. Many per Collection; cached totals re-synced.
- **OrderAdvance** — `salesFunnelId?, customerName, amountLakhs, receivedDate, mode,
  referenceNo, notes, status(=unapplied), appliedToCollectionId?, appliedDate?, recordedById`.
- **Notification** — `recipientId, type(payment|advance|system), title, body, link,
  amountLakhs?, isRead`. Index `(recipientId, isRead)`.

### Pipeline / CRM
- **CrmLead** — `title, companyName, contactPerson, email, phone, source(=Direct)`,
  external refs (`categoryId/Name, oemId/Name, productId/Name, customerId/Name`),
  `stage(=NEW_LEAD), expectedValue, remarks`, `assignedToId, createdById`.
  Stages: `NEW_LEAD → CONTACTED → QUALIFIED → REQUIREMENT_GATHERED → SOLUTION_PROPOSED →
  POC_DEMO → PROPOSAL_SENT`.
- **CrmOpportunity** — `leadId(unique), stage(=PROPOSAL_SENT), value, expectedClosureDate?,
  probability(=50), lostReason, status(=active)`.
  Stages: `PROPOSAL_SENT | FOLLOW_UP | NEGOTIATION | WON | LOST | ON_HOLD`.
- **CrmTask** — `title, description, dueDate, assignedToId, status(=pending),
  priority(=medium), leadId?, opportunityId?`.
- **CrmMeeting** — `title, meetingDate, notes, attendees, location, leadId?,
  opportunityId?, employeeId`.
- **CrmActivity** — `entityType, entityId, action, description, meta(JSON), performedById,
  timestamp, leadId?, opportunityId?` (audit feed).
- **CrmNote** — `content, leadId, authorId`.

### Master & config
- **Customer** — `name, address, district, state, pincode, gstNo, officeType(=HO),
  parentId?` (self-relation `CustomerBranches`), `crmSource`. Auto-seeded + deduped.
- **AppSetting** — `category, key(unique), label, value(JSON), description, updatedAt,
  updatedById?`. Defaults in `src/lib/settings.ts`; DB rows override.
- **AppRole** — `name(unique=Employee.role), label, level(100=top), color, isSystem,
  description`, `pageAccess[]`.
- **RolePageAccess** — `roleId, pageKey, canView/Create/Edit/Delete`, unique
  `(roleId, pageKey)`. 14 pages in `rbac.ts`.

## 2. Relationships
- **Employee 1—N** KRA, WeeklyReview, WeeklyCommit, Certification, LeadGeneration,
  SalesFunnel, Collection, DailyUpdate, Payment (recordedBy), OrderAdvance (recordedBy),
  Notification (recipient), CrmLead (assignedTo + createdBy), CrmTask, CrmMeeting,
  CrmActivity, CrmNote.
- **Employee 1—N Employee** via `reportsTo`/`reports` (`OrgChart`, `onDelete: SetNull`).
- **KRA 1—N** WeeklyReview, WeeklyCommit, Certification.
- **Collection 1—N Payment.** Cached fields on Collection are derived from this ledger.
- **CrmLead 1—1 CrmOpportunity**; CrmLead 1—N Task/Meeting/Activity/Note.
- **CrmOpportunity 1—N** Task/Meeting/Activity.
- **AppRole 1—N RolePageAccess** (`onDelete: Cascade`).
- **Customer 1—N Customer** via `parent`/`branches` (HO → branches).

## 3. Cascade Rules
- Child rows `onDelete: Cascade` from Employee / CrmLead / CrmOpportunity / Collection /
  AppRole.
- `Employee.reportsTo` → `onDelete: SetNull`.
- `Customer.parent` is a soft self-relation (no cascade).

## 3b. Indexes (added in the MySQL baseline)
Beyond the implicit unique indexes, `@@index` covers FK / hot-filter columns:
`Employee.reportsToId` · `KRA.employeeId` · `WeeklyReview(employeeId, kraId)` ·
`LeadGeneration.employeeId` · `SalesFunnel.employeeId` + `(stage,status)` ·
`Collection.employeeId` + `collectionStatus` + `dueDate` · `Payment.collectionId` +
`paymentDate` + `recordedById` · `OrderAdvance.recordedById` + `status` ·
`Notification(recipientId,isRead)` + `createdAt` · `DailyUpdate(employeeId,date)` ·
`WeeklyCommit(employeeId,week,year)` + `kraId` · `Certification.employeeId` + `kraId` ·
`CrmLead.assignedToId/createdById/stage` · `CrmOpportunity(stage,status)` ·
`CrmTask.assignedToId/leadId/opportunityId` · `CrmMeeting.leadId/opportunityId/employeeId` ·
`CrmActivity.leadId/opportunityId/performedById/timestamp` · `CrmNote.leadId/authorId` ·
`Customer.parentId` + `name`.

## 4. Migration history
- **2026-06-02 — SQLite → MySQL/MariaDB.** The pre-migration SQLite migration history (16
  migrations: `init` → … → `reports_to_hierarchy`) was **removed**; a single MySQL baseline
  **`20260601000000_init_mysql`** now represents the full schema. `migration_lock.toml`
  provider is `mysql`. On production, the `_prisma_migrations` table was seeded with a
  baseline row so `prisma migrate deploy` is a no-op against the already-built DB.
- **Data migration:** read from SQLite via `better-sqlite3`, loaded into MariaDB via the
  `mysql` CLI (FK checks off during load), AUTO_INCREMENT counters reset to `MAX(id)+1`, then
  every table's row count verified identical (all 22 matched).

## 5. Important Rules
- **Local workflow (now MySQL):**
  ```bash
  # DATABASE_URL must point at a MySQL/MariaDB dev DB (host 127.0.0.1)
  npx prisma migrate dev --name <change>
  npx prisma generate
  # then RESTART the dev server (Turbopack caches the old client → 500s)
  ```
- **`contains` is case-insensitive** under `utf8mb4_unicode_ci`; `mode:"insensitive"` is
  unnecessary (it threw on SQLite; harmless-but-pointless on MySQL).
- **Money** stored in ₹ Lakhs as `Float`/`DOUBLE`. **Deferred:** switch `*Lakhs`/value fields
  to `@db.Decimal(12,4)` for exact decimal storage (avoids `DOUBLE` drift; `round2()` is the
  current mitigation). A native-type override needs no app-code change but verify aggregates.
- **Collection cached fields** (`amountReceivedLakhs`, `collectionStatus`,
  `paymentReceivedDate`) must only be changed via `syncCollectionTotals()` — never hand-set.
- **Closed Won** requires `poDate`; the app enforces this before write.
- **`url` is not allowed in `schema.prisma`** (Prisma 7) — keep it in `prisma.config.ts`.
- Prisma client output lives in `src/generated/prisma` — regenerate, never hand-edit.
- **Transaction safety (debt):** `recordPayment`/`applyAdvance` in `payments.ts` run multiple
  writes WITHOUT a `$transaction`, and `syncCollectionTotals` is read-modify-write. Under
  SQLite's single-writer this was safe; on MySQL with concurrent connections wrap these in
  `prisma.$transaction` (and consider `SELECT … FOR UPDATE`) before high write volume.

---

## 6. Platform Migration Record (append-only)

### SQLite → MySQL — completed 2026-06-02

| Item | Before | After |
|---|---|---|
| Engine | SQLite (file-based) | **MySQL 8-compatible · MariaDB 11.8** |
| ORM adapter | `@prisma/adapter-better-sqlite3` | `@prisma/adapter-mariadb` |
| Provider | `sqlite` | **`mysql`** |
| Migrations | 16 SQLite migrations (`init` → `reports_to_hierarchy`) | 1 MySQL baseline (`20260601000000_init_mysql`) |
| Datasource URL | `prisma.config.ts` (SQLite file path) | `prisma.config.ts` (**`DATABASE_URL`** — MySQL TCP) |

All 22 tables were migrated with identical row counts verified. SQLite is permanently
removed from the codebase. `better-sqlite3` / `@types/better-sqlite3` remain in
`package.json` as a cleanup debt item (safe to remove; only used by the deleted migration script).

### Canonical database stack (do not change without updating this section)
```
Database : MySQL 8-compatible — MariaDB 11.8 (Hostinger)
ORM      : Prisma 7 (prisma-client generator — driver-adapter mode, no binary engine)
Adapter  : @prisma/adapter-mariadb  +  mariadb (npm driver)
Provider : mysql   (schema.prisma)
Collation: utf8mb4_unicode_ci   (case-insensitive LIKE / contains)
```

### MySQL-compatible Prisma design rules — mandatory for all future modules
Every new Prisma model, migration, API route, or service file added to this project must
follow these rules without exception:

1. **`provider = "mysql"`** — the schema provider must never be changed back to `sqlite`
   or switched to `postgresql` without a full migration plan.

2. **`url` in `prisma.config.ts` only** — Prisma 7's `prisma-client` generator does not
   allow `url` inside `schema.prisma`. Keep it in `prisma.config.ts`.

3. **`@db.Text` on all long strings** — MySQL maps an undecorated Prisma `String` to
   `VARCHAR(191)`, silently truncating content over 191 characters. Any field that holds
   notes, descriptions, JSON, remarks, or free-form text must use `@db.Text`.

4. **`@@index` on every FK and filter column** — MySQL does not auto-create indexes on
   foreign-key columns the way SQLite did. Missing indexes produce silent full-table scans.
   Add `@@index([foreignKeyColumn])` for every relation field and every column that appears
   in `where` clauses.

5. **Money fields** — current standard is `Float` → MySQL `DOUBLE`. The planned upgrade is
   `@db.Decimal(12,4)` for exact decimal arithmetic. Never use `Int` or `String` for money.

6. **Case-insensitive search** — the `utf8mb4_unicode_ci` collation makes `contains`
   (and `LIKE`) case-insensitive by default. Do not add `mode: "insensitive"` to Prisma
   queries — it is unnecessary and was only valid on PostgreSQL.

7. **Connection string** — always use `127.0.0.1` as the host, never `localhost`. The
   `mariadb` Node driver maps `localhost` to a unix socket which times out on Hostinger.

8. **Prisma migrations against MySQL only** — running `prisma migrate dev` requires a live
   MySQL/MariaDB instance. SQLite file-path URLs will be rejected by `provider = "mysql"`.
   Set `DATABASE_URL` in your local `.env` to a MySQL connection string before running any
   migration command.

9. **Multi-step writes → `prisma.$transaction`** — MySQL supports real concurrent
   connections. Any sequence of reads + writes that must be atomic (e.g., recording a
   payment and syncing collection totals) must be wrapped in `prisma.$transaction` to
   prevent partial writes under concurrency.

---

## 7. Finance Operations Module — Phase 1 (database, 2026-06-02)

> Implemented + tested on the dev DB; **uncommitted** at session end. No API/UI yet.
> Full column-level spec: `docs/modules/finance/DATABASE_SCHEMA.md` + `PRISMA_MODELS.md`.

### Models added (10)
| Model | Purpose | Key fields / notes |
|---|---|---|
| `FinAccount` | Chart of accounts (cash + bank) | `type` (cash\|bank), `currentBalance` (cached) |
| `Ledger` | General ledger entries vs an account | `direction` (debit\|credit), `reconciled`, FK→FinAccount/Voucher/Employee |
| `Vendor` | Vendor master | GSTIN, PAN, bank, `paymentTerms`, soft `isActive` |
| `Expense` | Expense register | category inline, `gstRate/gstAmountLakhs`, `attachmentsJson` (Text), `status` |
| `Voucher` | Numbered vouchers | `voucherNo @unique` (`CI/YY-YY/00001`), `type`, `status` |
| `VoucherSequence` | Atomic per-FY counter | `financialYear @unique`, `lastNumber` (increment in `$transaction`) |
| `EmployeeAdvance` | Staff advances | `advanceNo @unique`, lifecycle pending→disbursed→settled, `balanceLakhs` (cached) |
| `TravelClaim` | Local conveyance | GPS lat/lng, `distanceKm`, `mode`, `ratePerKm`, `amountLakhs` |
| `ApprovalRule` | Approval policy | amount thresholds + role per level (1–3), `entityType` |
| `AuditLog` | Generic financial audit trail | `entityType+entityId`, `action`, `performedById`, `changes` (JSON Text) |

Plus **9 back-reference relations on `Employee`** (`ledgerEntries`, `expenses`,
`expensesApproved`, `vouchersCreated`, `employeeAdvances`, `employeeAdvancesApproved`,
`travelClaims`, `travelClaimsApproved`, `auditLogs`).

### FK delete rules
- Required refs (`Ledger.accountId/recordedById`, `Expense.employeeId`, `Voucher.createdById`,
  `EmployeeAdvance/TravelClaim.employeeId`, `AuditLog.performedById`) → `ON DELETE RESTRICT`.
- Optional refs (`*.voucherId`, `Expense.vendorId/approvedById`, `*.approvedById`) → `ON DELETE SET NULL`.
- `disbursedFromId` (EmployeeAdvance) and `pairedLedgerId` (Ledger) are **soft refs** (no FK).

### Cached fields (mutate via service only — no API in Phase 1)
`FinAccount.currentBalance`, `EmployeeAdvance.balanceLakhs`, `VoucherSequence.lastNumber`.

### Migration
- **`20260602120000_finance_operations_phase1`** — 10 `CREATE TABLE`, 15 FKs, inline indexes,
  `utf8mb4_unicode_ci`. **Generated offline** via
  `prisma migrate diff --from-schema <baseline> --to-schema prisma/schema.prisma --script`
  (no local MySQL was available). Applies on the next `prisma migrate deploy` (Hostinger build).

### Seeds
- `prisma/seed.ts` — finance **config** (cash+bank account, `VoucherSequence` FY 26-27,
  default `ApprovalRule`); idempotent; wired via `prisma.config.ts` `migrations.seed`.
- `prisma/seed-dev-users.ts`, `prisma/seed-dev-finance.ts` — **dev-only**, run with `npx tsx`.
