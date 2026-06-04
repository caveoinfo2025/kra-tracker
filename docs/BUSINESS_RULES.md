# Business Rules

## Application purpose
Internal **Sales CRM + KRA performance tracker** for **Caveo Infosystems** (IT
infrastructure / security reseller). It runs the sales pipeline, captures activity sheets,
**auto-computes weekly KRA performance** from those sheets, manages billing/collections +
payments, and gives managers team dashboards. A mobile app supports field reps.

> **2026-06-04 Session 2 — Role-Adaptive Dashboard rules:**
> - **Director / Head of Sales (Manager):** sees full sales pipeline — funnel breakdown, pipeline
>   KPIs (pipeline/won), team pipeline chart, team collection summary.
> - **Operations Head:** sees Finance/HR/Collections focus — team KRA average + pending approvals
>   KPIs, Team KRA Progress card instead of sales funnel, approvals quick-access panel
>   (Expenses/Advances/Conveyance/Payments categories).
> - **Technical Head:** same team-oriented view as Operations Head — KRA/tasks-focused dashboard.
> - **Employee:** standard personal dashboard — own KRA, own collections, personal stats.
> - Role is read **live from DB on every dashboard load** — no stale JWT delays.

> **2026-06-04 Session 2 — Settings & Admin rules:**
> - All new configuration keys (`finance.*`, `approvals.*`, `masters.*`) default to safe/reasonable
>   values. `finance.expense_receipt_required_above = 500` (₹). `approvals.auto_approve_below_amount
>   = 0` (off by default). `masters.gstin_validation_enabled = true`.
> - **Settings Hub (`/settings`)** is navigation-only — it never mutates config. All config writes
>   go through `/settings/administration` → `AdminClient` → `POST /api/settings`.

> **2026-06-04 Session 1 — Global Masters + Expense Categories UI rules (prototyped, mock):**
> - **Expense Categories** (`/finance/expenses/categories`) — a **configuration-driven category
>   engine**: each category carries usage flags (General/Customer/Employee/Advance/Conveyance/
>   Vendor), allowed payment modes, document rules (bill always/amount-based/optional + threshold),
>   GST config (rate + goods/services + input-credit), approval rule (always / above ₹ threshold +
>   approvers), grade-based HR limits (daily/monthly per grade), customer-cost linkage, and Tally
>   ledger mapping. Parent/sub-category hierarchy; load-from-template (7 default groups).
> - **GSTIN validation rule (shared, both masters):** GSTIN must be 15 chars matching the format
>   regex; the **first 2 digits = state code must match the site/branch state** — on mismatch the
>   UI shows "GST state code does not match …". Full Indian state-code map in `vendors/data.ts`,
>   reused by Customer Master. One validator, both masters.
> - **Vendor Master = GLOBAL master:** one `Vendor` record referenced by Finance/Expense/
>   Procurement/Inventory/Projects/Support/Assets/Tally. A vendor has multiple branches, each
>   with its own GST; multiple contacts; multiple bank accounts; documents with expiry alerts.
> - **Customer Master = GLOBAL master:** one `Customer` record referenced by CRM Sales/Opps/
>   Quotations/Orders/Projects/Support/AMC/Assets/Finance/Profitability/Engineer-Visits/
>   Conveyance. Supports parent→child **hierarchy** (group company → subsidiaries), multiple
>   **sites** (each with own GST + geo lat/long for conveyance distance), contacts (decision
>   role), commercial terms (payment/credit/rating/currency/tax), assets (warranty/AMC/SLA),
>   documents, and **profitability** (revenue − product/service/travel/expense costs = gross
>   margin). **Duplicate detection** on create warns on name / PAN / GSTIN / email-domain match.
>   These are UI behaviours only until the backend enforces them.
>
> **2026-06-03 — Finance Phase 2 UI rules (prototyped, mock):** Expense types = General /
> Customer / Employee / Vendor. **Customer expenses** capture customer/project/SO and feed a
> profitability cost-impact preview. **Employee claims** can adjust against an advance balance
> (advance − claim = remaining). **GST** auto-splits CGST/SGST (intra) or IGST (inter) from a
> taxable amount + rate. **Approval flow:** Created → Manager Approval → Accounts Approval →
> Paid (statuses: Draft/Pending/Approved/Rejected/Paid). **Cash reconciliation** flags a
> variance (short/excess) and requires remarks. **Bank↔Cash transfers** post paired ledger
> legs. **Vouchers** number `CI/YY-YY/00001`. These are UI behaviours only until the backend
> enforces them server-side.

## User roles
| Role | Reach |
|---|---|
| **Head of Sales** | `isManager=true`. Everything: team dashboards, admin panel, all data. |
| **Business Development Manager** | Full pipeline + analytics + team view. |
| **BDE / Inside Sales / ISR** | Own leads, pipeline, collections, daily updates, KRAs. |
| **Sales Coordinator** | Tasks, collections, daily updates; read-only leads. |
| **Accounts** | All collections + payment tracker; no pipeline. |
| **Operations Head** | Above Accounts; manager-like **finance** reach **without** `isManager`. |

Reporting hierarchy is modeled on `Employee.reportsTo` (e.g. Accounts → Operations Head →
Head of Sales).

## Business workflows
1. **Lead → Opportunity:** create `CrmLead` → advance stages
   (`NEW_LEAD → CONTACTED → QUALIFIED → REQUIREMENT_GATHERED → SOLUTION_PROPOSED →
   POC_DEMO → PROPOSAL_SENT`). Reaching **PROPOSAL_SENT auto-creates a `CrmOpportunity`**.
2. **Opportunity → Win/Loss:** `PROPOSAL_SENT → FOLLOW_UP → NEGOTIATION → WON | LOST | ON_HOLD`.
3. **Order → Billing → Collection:** a Closed Won `SalesFunnel` deal → invoice
   (`Collection`) → one or more `Payment`s → status progresses to Fully Received.
4. **Activity capture:** reps log `LeadGeneration`, `SalesFunnel`, `Collection`,
   `DailyUpdate`. The **KRA engine** reads these to compute progress.
5. **Weekly cadence:** reps file weekly commits + reviews; managers monitor via dashboards.
6. **POC/Demo → Presales:** moving a lead to the `POC_DEMO` stage opens a prompt that
   schedules a POC/Demo **meeting** AND creates a follow-up **task**, both assigned to a
   presales owner (any employee whose role/department contains "presales"; falls back to
   free pick). The assignee is notified. Meetings can also be scheduled ad-hoc and assigned
   to self or anyone.

## Approval processes
- **Certifications:** submitted `status=pending` → manager approves
  (`/api/certifications/[id]/approve`) → `status=approved`; only approved certs count
  toward the Sales Operations KRA.
- **Order advances:** recorded `status=unapplied` → finance applies to an invoice
  (`/api/advances/[id]/apply`) → creates a `Payment`, flips to `applied`.

### Finance Operations Module — Phase 1 rules (DB-ready, not yet enforced in code)
> Data model exists (2026-06-02); enforcement logic comes with the Phase 2+ services. See
> `docs/modules/finance/FINANCE_REQUIREMENTS.md`.
- **No negative cash:** a `Ledger` cash-out must never drive `FinAccount.currentBalance < 0`
  (enforce in the service before write, inside `prisma.$transaction`).
- **Voucher numbering:** `Voucher.voucherNo` = `CI/YY-YY/00001`, FY = Apr 1–Mar 31; the
  number comes from an **atomic increment** of `VoucherSequence.lastNumber` (per financial year).
- **Approval workflow:** `ApprovalRule` defines amount thresholds + an approver role per level
  (auto-approve ≤ limit, then L1/L2/L3). Drives Expense / EmployeeAdvance / TravelClaim states.
- **Expense lifecycle:** `draft → submitted → approved → rejected → paid`; on approval a
  `Voucher` is generated and an `AuditLog` row recorded.
- **Employee advance:** `pending → approved → disbursed → settled`; `balanceLakhs` = disbursed − settled.
- **Travel claim:** `amountRupees = distanceKm × ratePerKm` (rate snapshot from HR policy);
  GPS start/end captured; status `draft → submitted → approved → paid`.
- **Audit trail:** every finance state change should write an `AuditLog` entry
  (`entityType`, `entityId`, `action`, `performedById`).

## Status transitions
- **Lead stage** / **Opportunity stage** — see workflows above.
- **Collection status:** `Pending → Partially Received → Fully Received`, derived purely
  from the payment ledger by `syncCollectionTotals()` (never hand-set).
- **SalesFunnel stage:** `Lead … Closed Won | Closed Lost`. Reaching **Closed Won requires
  a PO date** and mirrors it into `closedDate`.
- **Certification:** `pending → approved` (or deleted).
- **OrderAdvance:** `unapplied → applied`.
- **Notification:** `isRead false → true`.

> **Note (2026-06-02):** the SQLite→MariaDB migration changed **no business rules** — every
> workflow, calculation, validation, and status transition below is unchanged and all data
> was preserved (row counts verified). Money remains ₹ Lakhs (now MySQL `DOUBLE`; exact
> `Decimal` is a deferred improvement). **Finance caveat:** `recordPayment`/`applyAdvance` are
> not yet wrapped in a DB transaction — fine at current volume, but wrap them before heavy
> concurrent writes on MySQL (see DATABASE.md §5).

## Calculations
- **Money:** everything in **₹ Lakhs** (1 Cr = 100 L).
- **KRA progress (0–100%) → score (1–10):** bands 100→10, 90→9, 75→8, 60→7, 50→6, 40→5,
  30→4, 20→3, >0→2, 0→1 (`toScore` in `kra-engine.ts`).
- **Sales Revenue KRA:** weighted blend — booking 0.375, billing 0.375, gross profit 0.125,
  on-time collections 0.125. Booking = Σ Closed Won `dealValueLakhs`; billing = Σ
  `amountWithoutGstLakhs`; GP = Σ(`dealValueLakhs × grossProfitPct/100`).
- **On-time collection rate** = invoice value paid on/before `dueDate` ÷ total invoice value
  (uses `paymentReceivedDate`; legacy "Fully Received" counts as on-time).
- **Forecast accuracy** = avg(min(1, ClosedWon₹L for the commit week ÷ committed₹L)) across
  weekly commits on the Sales Ops KRA.
- **Customer retention** = customers with ≥2 invoices ÷ unique customers billed.
- **Win rate** = Closed Won count ÷ total opportunities. **Focus-area mix** = Closed Won
  ₹L in {network, server, mssp, cloud} categories ÷ total Closed Won ₹L.
- KRA dispatch is by **title keyword** ("sales revenue", "customer & business",
  "sales management", "focus area", "sales operations"); targets parsed from the KRA's
  `"key:value;key:value"` target string.

## Automation rules
- PROPOSAL_SENT auto-creates an opportunity.
- Recording a payment re-syncs the invoice's cached totals **and** fans out a
  `Notification` to the invoice's sales rep + every manager.
- Closed Won auto-sets `closedDate = poDate`.
- Customer master **auto-seeds** from CRM names when empty; dedupes case-insensitively.
- First payment on an imported invoice inserts an "Opening Balance" ledger entry so the
  new payment **adds** to the pre-existing amount instead of overwriting it.
- JWT re-hydrates `isManager` + `role` from the DB on **every** refresh, so role/hierarchy
  changes made on the Team page apply without code edits (and, after one re-login to flush a
  pre-existing token, without sign-out).
- Assigning a meeting or task to someone other than the creator fires a `Notification` to
  the assignee.
- Role gating uses **flexible matching**: "Operations Head" matches any role containing
  "operations" + "head" (e.g. "HR & Operations Head"); "Accounts" matches any role
  containing "accounts".

## Restrictions
- **Closed Won without a PO date is rejected** (`400`).
- Non-managers see/edit **only their own** records (`employeeId`); finance roles
  (Accounts, Operations Head) may see all collections/payments.
- **System roles** cannot be deleted in the admin panel.
- Already-applied advances cannot be re-applied.
- Cached collection fields must only change via `syncCollectionTotals()`.
- Admin panel is **configuration/rules only** — never displays CRM data.

## Terminology
| Term | Meaning |
|---|---|
| **KRA** | Key Result Area — weighted performance metric, auto-scored from activity sheets |
| **₹L / ₹Cr** | Lakhs / Crores (1 Cr = 100 L) |
| **Booking** | Σ Closed Won deal value |
| **Billing** | Σ invoice amount excluding GST |
| **Closed Won** | `SalesFunnel.stage = "Closed Won"` (requires PO date) |
| **PO date** | Purchase-order date; gates Closed Won |
| **Pipeline** | Active (non-closed) opportunities |
| **Advance** | Payment received before an invoice exists; later applied |
| **Activity sheet** | LeadGeneration / SalesFunnel / Collection / DailyUpdate |
| **Dev session** | `dev_employee_id` cookie impersonation in development |
