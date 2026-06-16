import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";

/**
 * GET /api/finance/voucher-sequences
 *
 * Returns the current voucher numbering status for every financial year
 * recorded in VoucherSequence.
 *
 * The VoucherSequence model has a SINGLE global counter per financial year
 * (no per-type sequences).  The voucherNumber format is:
 *
 *   CI/{FY}/{NNNNNN}  e.g. CI/26-27/000001
 *
 * Response shape:
 *   { success: true, data: { sequences: [ ...SequenceRow ] } }
 *
 * SequenceRow:
 *   id             – sequence record id
 *   financialYear  – "26-27"
 *   lastNumber     – last issued counter (0 = none issued yet)
 *   nextNumber     – lastNumber + 1
 *   formatPreview  – formatted voucher number that would be issued next
 *   status         – ACTIVE | INACTIVE
 *   updatedAt      – ISO timestamp of last counter update
 *
 * Permission: canManageFinance (Accounts, Operations Head, Manager).
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFinance(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.voucherSequence.findMany({
    orderBy: { financialYear: "desc" },
  });

  // Determine "current" financial year from today's date (Indian FY: Apr–Mar)
  const now        = new Date();
  const month      = now.getMonth(); // 0-indexed; April = 3
  const calYear    = now.getFullYear();
  const fyStartYear = month >= 3 ? calYear : calYear - 1; // April = new FY
  const currentFY  = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;

  const sequences = rows.map((row) => {
    const isActive    = row.financialYear === currentFY;
    const nextNumber  = row.lastNumber + 1;
    const formatPreview = `CI/${row.financialYear}/${String(nextNumber).padStart(6, "0")}`;

    return {
      id:            row.id,
      financialYear: row.financialYear,
      lastNumber:    row.lastNumber,
      nextNumber,
      formatPreview,
      status:        isActive ? "ACTIVE" : "INACTIVE",
      updatedAt:     row.updatedAt.toISOString(),
    };
  });

  // If no row exists yet for the current FY, include a synthetic "pending init" entry
  const hasCurrent = rows.some((r) => r.financialYear === currentFY);
  if (!hasCurrent) {
    sequences.unshift({
      id:            0,
      financialYear: currentFY,
      lastNumber:    0,
      nextNumber:    1,
      formatPreview: `CI/${currentFY}/000001`,
      status:        "PENDING_INIT",
      updatedAt:     new Date(0).toISOString(),
    });
  }

  return NextResponse.json({ success: true, data: { sequences } });
}
