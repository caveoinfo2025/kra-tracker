/**
 * Central money helper — Decimal-safe parsing, serialization, rounding, arithmetic, and
 * display formatting for every ₹ amount in this codebase.
 *
 * Step 3H foundation work (see docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md). Built BEFORE any
 * Prisma schema field converts from Float to Decimal — every money field in `prisma/schema.prisma`
 * is still `Float`/`Float?` today. This helper exists so the eventual Float→Decimal conversion
 * (and the Finance write APIs built on top of it) have one consistent place to parse, round, and
 * serialize money instead of each route reinventing `Math.round(v * 100) / 100` (the pattern
 * already duplicated across nearly every `src/app/api/finance/*` route and `src/lib/payments.ts`).
 *
 * Uses Prisma's own Decimal implementation (`@prisma/client/runtime/client`'s `Decimal`, a
 * decimal.js-based exact-arithmetic type) — no new dependency added. Imported from the runtime
 * subpath directly, not from the generated client (`@/generated/prisma/client`), so this module
 * stays side-effect-free and does not pull in PrismaClient's Node-only bootstrap code
 * (`node:process`/`node:path`/`globalThis` assignment) just to get the Decimal class.
 *
 * ── Serialization policy (Task 4) ──────────────────────────────────────────────────────────────
 * - Persisted accounting/posting APIs (anything that writes or echoes back a ledger-grade amount)
 *   should serialize money as a STRING via `serializeMoney`/`moneyToString` — never a raw `number`.
 * - Display-only cards/dashboards may convert to a `number` ONLY through `moneyToNumberForDisplay`
 *   — never via a bare `Number(decimal)` or `.toNumber()` call scattered inline.
 * - Do NOT use `Number(decimal)` directly in Finance APIs.
 * - Do NOT use `parseFloat` for money inputs — use `parseMoneyInput`/`toMoneyDecimal`.
 * - Rounding happens through `roundMoney` — round only at the final posting/export/display step,
 *   not at every intermediate calculation (per the Decimal Migration Plan §6 calculation rules).
 * - Default money scale is 2 decimal places (`DEFAULT_MONEY_SCALE`). Per-unit rate fields (e.g.
 *   ₹/km) use a scale of 4 (`DEFAULT_RATE_SCALE`) since they are multipliers, not final amounts.
 *
 * This step does NOT wire this helper into any existing route, change any API response shape, or
 * convert any schema field — see docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md for the phased plan.
 */

import { Decimal } from "@prisma/client/runtime/client";

export { Decimal };

/** Anything duck-typed like a Decimal (Prisma's own, or another decimal.js-family instance). */
export interface DecimalLike {
  toFixed(dp?: number): string;
  toString(): string;
  toNumber?: () => number;
}

/** Every shape a money value may arrive in — from a DB row, a JSON body, or a literal. */
export type MoneyInput = string | number | bigint | null | undefined | Decimal | DecimalLike;

export const DEFAULT_MONEY_SCALE = 2;
export const DEFAULT_RATE_SCALE = 4;

/** Thrown by every strict parsing/arithmetic helper below on a null/invalid/non-finite value. */
export class InvalidMoneyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMoneyInputError";
  }
}

function isDecimalLike(v: unknown): v is DecimalLike {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as DecimalLike).toFixed === "function" &&
    typeof (v as DecimalLike).toString === "function"
  );
}

function assertFinite(d: Decimal, original: unknown): Decimal {
  if (!d.isFinite()) {
    throw new InvalidMoneyInputError(`Money value must be finite, got: ${String(original)}`);
  }
  return d;
}

// ── Parsing / conversion ───────────────────────────────────────────────────────────────────────

/**
 * Strictly parse a known-shape `MoneyInput` into a `Decimal`. Throws `InvalidMoneyInputError` on
 * null, undefined, empty string, non-numeric string, or non-finite (NaN/Infinity) values — never
 * silently coerces a missing value to zero. Use `safeMoneyDecimal` when zero-on-missing is the
 * explicitly intended behavior.
 */
export function toMoneyDecimal(input: MoneyInput): Decimal {
  if (input === null || input === undefined) {
    throw new InvalidMoneyInputError("Money value is required (received null/undefined)");
  }

  if (input instanceof Decimal) {
    return assertFinite(input, input);
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new InvalidMoneyInputError(`Money value must be finite, got: ${input}`);
    }
    return new Decimal(input);
  }

  if (typeof input === "bigint") {
    return new Decimal(input.toString());
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") {
      throw new InvalidMoneyInputError("Money value cannot be an empty string");
    }
    try {
      return assertFinite(new Decimal(trimmed), input);
    } catch (err) {
      if (err instanceof InvalidMoneyInputError) throw err;
      throw new InvalidMoneyInputError(`Invalid money value: "${input}"`);
    }
  }

  if (isDecimalLike(input)) {
    const str = input.toString();
    try {
      return assertFinite(new Decimal(str), input);
    } catch (err) {
      if (err instanceof InvalidMoneyInputError) throw err;
      throw new InvalidMoneyInputError(`Invalid Decimal-like money value: "${str}"`);
    }
  }

  throw new InvalidMoneyInputError(`Unsupported money input type: ${typeof input}`);
}

/**
 * Same strictness as `toMoneyDecimal`, but accepts `unknown` — the right entry point for raw
 * values coming straight off a JSON request body, where the caller hasn't yet narrowed the type.
 * Rejects booleans, arrays, plain objects, and anything else that isn't a `MoneyInput`.
 */
export function parseMoneyInput(input: unknown): Decimal {
  if (
    input === null ||
    input === undefined ||
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "bigint" ||
    input instanceof Decimal ||
    isDecimalLike(input)
  ) {
    return toMoneyDecimal(input as MoneyInput);
  }
  throw new InvalidMoneyInputError(`Unsupported money input type: ${typeof input}`);
}

/**
 * Lenient parse — never throws. Returns the parsed value, or `fallback` (parsed the same way,
 * defaulting to zero) if `input` is null/undefined/invalid. This is the explicit opt-in point for
 * "null/undefined becomes zero" behavior described in the serialization policy — every other
 * parsing/arithmetic helper in this module throws instead of guessing.
 */
export function safeMoneyDecimal(input: MoneyInput, fallback: MoneyInput = 0): Decimal {
  try {
    return toMoneyDecimal(input);
  } catch {
    try {
      return toMoneyDecimal(fallback);
    } catch {
      return new Decimal(0);
    }
  }
}

// ── Serialization ──────────────────────────────────────────────────────────────────────────────

/**
 * Format a money value as a fixed-2-decimal string for persisted/API serialization. Treats
 * null/undefined/invalid input as `"0.00"` (display-safe default), per the policy that
 * formatting may default missing values to zero even though parsing must not.
 */
export function moneyToString(input: MoneyInput, scale: number = DEFAULT_MONEY_SCALE): string {
  return safeMoneyDecimal(input).toFixed(scale);
}

/**
 * The canonical "serialize this money field for an API response" helper — same behavior as
 * `moneyToString`, named separately so call sites at an API boundary read as intentional
 * (`serializeMoney(row.amountLakhs)`) rather than a generic string conversion. For a genuinely
 * optional/nullable DB column where `null` means "not yet set" (e.g.
 * `EmployeeAdvance.disbursedAmountLakhs`) rather than "zero", check for `null` before calling this
 * — it always returns a string, never `null`.
 */
export function serializeMoney(input: MoneyInput, scale: number = DEFAULT_MONEY_SCALE): string {
  return moneyToString(input, scale);
}

/**
 * DISPLAY ONLY. Converts a money value to a plain JS `number` for chart libraries, summary cards,
 * or any UI surface that cannot consume a string. Never use this for a value that flows back into
 * a calculation, a persisted total, or a posting/export API response — `Decimal`'s exactness is
 * lost the moment it becomes a `number`. Treats null/undefined/invalid input as `0`.
 */
export function moneyToNumberForDisplay(input: MoneyInput): number {
  return safeMoneyDecimal(input).toNumber();
}

// ── Rounding / formatting ──────────────────────────────────────────────────────────────────────

/**
 * Round a money value to `scale` decimal places (default 2), half-up. Strict — throws on
 * null/undefined/invalid input, since rounding a missing value usually means a bug upstream, not
 * an intentional zero (use `safeMoneyDecimal` first if zero-on-missing is actually wanted).
 */
export function roundMoney(input: MoneyInput, scale: number = DEFAULT_MONEY_SCALE): Decimal {
  return toMoneyDecimal(input).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
}

/**
 * DISPLAY ONLY human-readable formatting (e.g. `"₹1,234.56"`), built on `Intl.NumberFormat`.
 * Treats null/undefined/invalid input as zero, consistent with the display-default policy.
 * Defaults to the `en-IN` locale and plain (no currency symbol) formatting if `currency` is
 * omitted — pass `{ currency: "INR" }` for a currency-symbol-prefixed string.
 */
export function formatMoney(
  input: MoneyInput,
  options?: { currency?: string; locale?: string; scale?: number }
): string {
  const scale = options?.scale ?? DEFAULT_MONEY_SCALE;
  const amount = safeMoneyDecimal(input).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP).toNumber();
  const locale = options?.locale ?? "en-IN";

  if (options?.currency) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: options.currency,
      minimumFractionDigits: scale,
      maximumFractionDigits: scale,
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
  }).format(amount);
}

// ── Arithmetic ──────────────────────────────────────────────────────────────────────────────────
// All arithmetic helpers are strict (throw on null/undefined/invalid) and return an unrounded,
// full-precision Decimal — round explicitly via roundMoney at the final posting/display step,
// never inside an intermediate calculation (Decimal Migration Plan §6).

/** Sum any number of money values. Throws if any value is null/undefined/invalid. */
export function addMoney(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((sum, v) => sum.plus(toMoneyDecimal(v)), new Decimal(0));
}

/** Subtract each subsequent value from `base`. Throws if any value is null/undefined/invalid. */
export function subtractMoney(base: MoneyInput, ...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.minus(toMoneyDecimal(v)), toMoneyDecimal(base));
}

/**
 * Multiply a money value by a multiplier (e.g. amount × gstRate). Pass `scale` to round the
 * result immediately (e.g. when posting a final tax amount); omit it to keep full precision for
 * a further chained calculation.
 */
export function multiplyMoney(value: MoneyInput, multiplier: MoneyInput, scale?: number): Decimal {
  const result = toMoneyDecimal(value).times(toMoneyDecimal(multiplier));
  return scale === undefined ? result : result.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
}

/**
 * Divide a money value by a divisor. Throws on division by zero. Pass `scale` to round the
 * result immediately; omit it to keep full precision for a further chained calculation.
 */
export function divideMoney(value: MoneyInput, divisor: MoneyInput, scale?: number): Decimal {
  const divisorDecimal = toMoneyDecimal(divisor);
  if (divisorDecimal.isZero()) {
    throw new InvalidMoneyInputError("Cannot divide a money value by zero");
  }
  const result = toMoneyDecimal(value).dividedBy(divisorDecimal);
  return scale === undefined ? result : result.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
}

// ── Comparisons ─────────────────────────────────────────────────────────────────────────────────

/** True if the value is exactly zero. Throws on null/undefined/invalid input. */
export function isZeroMoney(input: MoneyInput): boolean {
  return toMoneyDecimal(input).isZero();
}

/**
 * True if the value is strictly greater than zero. Deliberately stricter than decimal.js's own
 * `Decimal.isPositive()` (which treats `0` as positive) — for money, "is there a positive
 * balance/amount" should be `false` at exactly zero.
 */
export function isPositiveMoney(input: MoneyInput): boolean {
  return toMoneyDecimal(input).greaterThan(0);
}

/** True if the value is strictly less than zero. See `isPositiveMoney` for the zero-handling note. */
export function isNegativeMoney(input: MoneyInput): boolean {
  return toMoneyDecimal(input).lessThan(0);
}
