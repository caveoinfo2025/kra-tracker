# Business Rules

## Application purpose
Internal **Sales CRM + KRA performance tracker** for **Caveo Infosystems** (IT
infrastructure / security reseller). It runs the sales pipeline, captures activity sheets,
**auto-computes weekly KRA performance** from those sheets, manages billing/collections +
payments, and gives managers team dashboards. A mobile app supports field reps.

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

## Approval processes
- **Certifications:** submitted `status=pending` → manager approves
  (`/api/certifications/[id]/approve`) → `status=approved`; only approved certs count
  toward the Sales Operations KRA.
- **Order advances:** recorded `status=unapplied` → finance applies to an invoice
  (`/api/advances/[id]/apply`) → creates a `Payment`, flips to `applied`.

## Status transitions
- **Lead stage** / **Opportunity stage** — see workflows above.
- **Collection status:** `Pending → Partially Received → Fully Received`, derived purely
  from the payment ledger by `syncCollectionTotals()` (never hand-set).
- **SalesFunnel stage:** `Lead … Closed Won | Closed Lost`. Reaching **Closed Won requires
  a PO date** and mirrors it into `closedDate`.
- **Certification:** `pending → approved` (or deleted).
- **OrderAdvance:** `unapplied → applied`.
- **Notification:** `isRead false → true`.

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
- JWT re-hydrates `isManager` + `role` from the DB on every refresh (role changes apply
  without re-login).

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
