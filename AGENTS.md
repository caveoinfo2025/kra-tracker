<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing Instructions

## Project Stack

- Next.js application
- Prisma ORM
- MySQL database
- Playwright for functional and E2E coverage

## Testing Priorities

- Prefer Playwright for functional and end-to-end testing.
- Keep business logic unchanged unless a code change is required to make testing possible.
- Add `data-testid` attributes only when existing accessible selectors, text selectors, labels, roles, or stable DOM hooks are missing.
- Reuse shared test helpers instead of duplicating setup across specs.

## Database Safety

- Always use a separate MySQL test database for automated tests.
- Never point tests at production credentials or a production database.
- Store test credentials in `.env.test` and keep an example template in `.env.test.example`.
- Before running Prisma commands for tests, verify the active `DATABASE_URL` belongs to the isolated test database.
- Do not run destructive cleanup against shared, staging, or production data.
- Clean up only records created by the active test run or by clearly namespaced test fixtures.

## Prisma And Environment Rules

- Load test environment variables from `.env.test` when running test workflows.
- Use Prisma migrations or schema sync only against the test database during test setup.
- If seed data is required, seed only the minimum safe data needed for the scenario.
- Prefer deterministic fixture records with recognizable test-only prefixes so cleanup is targeted and auditable.

## Playwright Expectations

- Put Playwright specs under `tests/`.
- Add and maintain reusable login helpers for authenticated flows.
- Prefer helper-based authentication setup over duplicating cookie or session bootstrapping in each spec.
- Cover both happy paths and role-based/permission-sensitive flows where relevant.
- For UI regressions, prefer assertions on visible behavior and page state rather than implementation details.
- Keep selectors resilient: prefer `getByRole`, `getByLabel`, `getByText`, and only fall back to `data-testid` when necessary.

## Validation After Changes

- Run lint after changes.
- Run a production build after changes.
- Run Playwright tests after changes.
- If a full Playwright run is too expensive for the current change, run the smallest relevant subset first, then note what remains unverified.

Recommended validation sequence:

1. `npm run lint`
2. `npm run build`
3. `npx playwright test`

Dedicated test-database helpers:

1. `npm run db:test:check`
2. `npm run db:test:push` or `npm run db:test:migrate`
3. `npm run db:test:seed` if the scenario needs seeded data
4. `npm run build:test`
5. `npm run test:e2e` or `npm run test:e2e:smoke`

The `db:test:*`, `build:test`, and `test:e2e*` scripts must refuse to run if
`.env.test` is missing or if the configured database does not clearly appear to
be an isolated test database.

## Test Documentation

- Document every newly created or modified test file in your final summary.
- State what each test file covers and any important gaps that remain.
- When adding coverage for a new flow, mention the user journey, role, and cleanup strategy.
- If test helpers or fixtures are introduced, document where they live and which specs depend on them.

## Existing Repo Notes

- Current Playwright config lives in `playwright.config.ts`.
- Current shared Playwright helper file lives in `tests/helpers.ts`.
- Existing Playwright coverage already includes desktop, mobile, API, authentication, route loading, and RBAC-oriented scenarios under `tests/`.
