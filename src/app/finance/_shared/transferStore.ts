/**
 * Cross-module transfer store (Phase 2, UI only).
 *
 * The Cash Book and Bank Book each hold their own local React state seeded from
 * their own mock arrays, so a Bank↔Cash transfer made in one module would never
 * appear in the other. This module-level singleton holds the *extra* paired
 * entries created by transfers; both books seed from `mock + extra` on mount, so
 * a transfer recorded in the Cash Book shows up in the Bank Book on navigation
 * (and vice-versa). Replaced by the real ledger service when finance APIs land.
 */

import type { BankTxn } from "../bank-book/data";
import type { CashTxn } from "../cash-book/data";

const extraBank: BankTxn[] = [];
const extraCash: CashTxn[] = [];

export function getExtraBankTxns(): BankTxn[] { return extraBank; }
export function getExtraCashTxns(): CashTxn[] { return extraCash; }

export function pushBankTxn(t: BankTxn): void { extraBank.push(t); }
export function pushCashTxn(t: CashTxn): void { extraCash.push(t); }

/** Next id for store-created bank entries (kept clear of the seed range). */
export function nextExtraBankId(): number { return 900 + extraBank.length + 1; }
