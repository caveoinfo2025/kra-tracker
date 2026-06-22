import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

// Future-safe action constants. Keep in sync with the `action` values
// documented in docs/database/SOFT_DELETE_DECISION_LOG.md §11. Existing call
// sites are free to keep using their own literal strings — these constants
// are for new code, not a forced rename.
export const AUDIT_ACTIONS = {
  SOFT_DELETE: "SOFT_DELETE",
  RESTORE: "RESTORE",
  DELETE_BLOCKED_REFERENCE_EXISTS: "DELETE_BLOCKED_REFERENCE_EXISTS",
  VOUCHER_VOID: "VOUCHER_VOID",
  LEDGER_REVERSAL: "LEDGER_REVERSAL",
  PAYMENT_POSTED: "PAYMENT_POSTED",
  EXPENSE_APPROVED: "EXPENSE_APPROVED",
  ADVANCE_SETTLED: "ADVANCE_SETTLED",
} as const;

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string;

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export interface LogAuditEventArgs {
  tx?: PrismaOrTx;
  entityType: string;
  entityId: number;
  action: AuditAction;
  performedById: number;
  notes?: string;
  changes?: unknown;
}

/**
 * Write one AuditLog row using the project's existing model shape
 * (prisma/schema.prisma `AuditLog`). Matches the shape already proven by
 * `DELETE /api/pipeline/leads/[id]` and the Step 3D soft-delete routes —
 * no new fields, no new model.
 *
 * Pass `tx` (a `prisma.$transaction` callback client, or one of the array
 * items returned from `prisma.$transaction([...])`) to keep the audit write
 * atomic with the data change it documents. Omit it to use the default
 * `prisma` client for a standalone write.
 */
export function logAuditEvent(args: LogAuditEventArgs) {
  const { tx, entityType, entityId, action, performedById, notes, changes } = args;

  if (!entityType || !entityId || !action || !performedById) {
    throw new Error(
      "logAuditEvent: entityType, entityId, action, and performedById are required"
    );
  }

  const client = tx ?? prisma;
  return client.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      performedById,
      notes: notes ?? "",
      changes: changes !== undefined ? JSON.stringify(changes) : "",
    },
  });
}

export interface LogSoftDeleteArgs {
  tx?: PrismaOrTx;
  entityType: string;
  entityId: number;
  performedById: number;
  reason: string;
  oldValues: unknown;
}

/**
 * Convenience wrapper over `logAuditEvent` for the soft-delete case —
 * fixes `action` to `AUDIT_ACTIONS.SOFT_DELETE` and `changes` to the
 * pre-delete row snapshot, matching every existing soft-delete AuditLog
 * write in this codebase.
 */
export function logSoftDelete(args: LogSoftDeleteArgs) {
  const { tx, entityType, entityId, performedById, reason, oldValues } = args;
  return logAuditEvent({
    tx,
    entityType,
    entityId,
    action: AUDIT_ACTIONS.SOFT_DELETE,
    performedById,
    notes: reason,
    changes: oldValues,
  });
}
