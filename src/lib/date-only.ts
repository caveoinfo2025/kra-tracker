/**
 * Shared date-only helpers — Phase W4.1.
 *
 * Two distinct Date "shapes" exist in this codebase and must never be mixed without an
 * explicit conversion:
 *
 *   1. **Local-midnight Date** — a `Date` whose *local* (server-timezone) components are
 *      midnight of the intended calendar day. This is the shape all business logic uses
 *      (`evaluateSubmissionWindow`, `startOfDay`, same-day/late-submission comparisons, "today").
 *      Produced by `parseDateOnlyAsLocalDate` / `new Date()`; read back with `toDateKeyLocal`.
 *
 *   2. **DB date-only value** — the `Date` object that round-trips correctly through a Prisma
 *      `@db.Date` MySQL/MariaDB column. Produced by `dateKeyToDbDate`; read back with
 *      `dbDateToDateKey` / `dbDateToLocalDate`.
 *
 * Root cause (Phase W4 discovery): writing a *local*-midnight `Date` directly into a `@db.Date`
 * column truncates it to the previous *UTC* calendar day on any positive-UTC-offset server (IST
 * confirmed: local-midnight 2026-06-29 round-trips as 2026-06-28T00:00:00.000Z). The fix adopted
 * here is a single consistent strategy: **DB date-only values are always tagged using UTC
 * components** (`Date.UTC(y, m-1, d)`), never local components. A UTC-midnight instant for a
 * given calendar day is immune to the local-timezone shift in both directions (write and read),
 * because the value going in and the value coming out are both interpreted via UTC getters —
 * the local server offset never enters the round trip.
 *
 * Practical rule: anywhere a `Date` is about to be written to, or has just been read from, an
 * `activityDate`/`summaryDate`/`periodStart`/`periodEnd` (or any other `@db.Date`) column, it
 * must pass through `dateKeyToDbDate` (write) or `dbDateToLocalDate`/`dbDateToDateKey` (read).
 * Never use `new Date("YYYY-MM-DD")` or `.toISOString()` for date-only values — see the banned
 * patterns audited in docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md Phase W4.1.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function assertValidCalendarDate(
  dateString: string,
  year: number,
  month: number,
  day: number,
  rolledOver: boolean
): void {
  if (rolledOver) throw new RangeError(`Invalid calendar date: "${dateString}"`);
}

/**
 * Parses a `YYYY-MM-DD` date-only string into a **local-midnight Date** — i.e. a `Date` whose
 * local (server-timezone) year/month/day components are exactly the parsed values.
 *
 * Built directly from the local-time `Date(year, monthIndex, day)` constructor, so it never
 * goes through a UTC intermediate and is immune to the IST/positive-UTC-offset day-shift.
 *
 * Throws `RangeError` on malformed input (wrong format, non-numeric, or an invalid calendar
 * date such as 2026-13-01 or 2026-02-30) — callers should catch this and respond 400.
 */
export function parseDateOnlyAsLocalDate(dateString: string): Date {
  const match = DATE_ONLY_RE.exec(dateString ?? "");
  if (!match) throw new RangeError(`Invalid date format (expected YYYY-MM-DD): "${dateString}"`);

  const year = Number(match[1]);
  const month = Number(match[2]); // 1-12
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // new Date(y, m, d) silently rolls invalid day/month values over into the next period
  // (e.g. month 13 → next January, Feb 30 → Mar 2) — detect that by reading the components
  // back and rejecting any mismatch, since a roll-over is never a valid date-only input here.
  const rolledOver =
    date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day;
  assertValidCalendarDate(dateString, year, month, day, rolledOver);

  return date;
}

/** Formats a **local-midnight Date** as `YYYY-MM-DD` using its *local* date components — the
 *  inverse of `parseDateOnlyAsLocalDate`. Never use `date.toISOString().slice(0, 10)` for this
 *  (that reads UTC components and is subject to the same day-shift on positive-UTC-offset
 *  servers). Do NOT pass a raw DB-read `@db.Date` value here — convert with `dbDateToDateKey`
 *  or `dbDateToLocalDate` first. */
export function toDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converts a `YYYY-MM-DD` date key into the **DB date-only value** to write into a Prisma
 * `@db.Date` column on this app's MySQL/MariaDB setup — built from UTC components
 * (`Date.UTC(y, m-1, d)`) so the calendar day survives the round trip regardless of server
 * timezone offset. Use this for every write to `activityDate`/`summaryDate`/`periodStart`/
 * `periodEnd`/any other `@db.Date` field, and for building the `where` value when querying one.
 *
 * Throws `RangeError` on malformed input or an invalid calendar date (same validation as
 * `parseDateOnlyAsLocalDate`).
 */
export function dateKeyToDbDate(dateKey: string): Date {
  const match = DATE_ONLY_RE.exec(dateKey ?? "");
  if (!match) throw new RangeError(`Invalid date format (expected YYYY-MM-DD): "${dateKey}"`);

  const year = Number(match[1]);
  const month = Number(match[2]); // 1-12
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  const rolledOver =
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day;
  assertValidCalendarDate(dateKey, year, month, day, rolledOver);

  return date;
}

/** Formats a **DB-read `@db.Date` value** as `YYYY-MM-DD` using *UTC* components — the inverse
 *  of `dateKeyToDbDate`. Always use this (not `toDateKeyLocal`, not `.toISOString()`) to read a
 *  Prisma `@db.Date` field back into a date key. */
export function dbDateToDateKey(dbDate: Date): string {
  const y = dbDate.getUTCFullYear();
  const m = String(dbDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dbDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converts a **DB-read `@db.Date` value** back into a **local-midnight Date**, so it can be fed
 * into local-time business logic (`startOfDay`, `evaluateSubmissionWindow`, same-day diffing,
 * re-querying another `@db.Date` field) without the double-shift that bit Phase W4's correction
 * approve/reject flow (where a DB-read value was passed straight into `startOfDay()`'s local-time
 * `setHours`). Equivalent to `parseDateOnlyAsLocalDate(dbDateToDateKey(dbDate))`.
 */
export function dbDateToLocalDate(dbDate: Date): Date {
  return parseDateOnlyAsLocalDate(dbDateToDateKey(dbDate));
}

/** Convenience composition: converts a **local-midnight Date** directly into the **DB date-only
 *  value** to write/query a `@db.Date` column. Equivalent to `dateKeyToDbDate(toDateKeyLocal(date))`. */
export function localDateToDbDate(date: Date): Date {
  return dateKeyToDbDate(toDateKeyLocal(date));
}
