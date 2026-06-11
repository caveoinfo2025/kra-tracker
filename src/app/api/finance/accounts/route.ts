import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";

/**
 * Format a Float (₹ Lakhs stored as DOUBLE) as a fixed-precision string.
 * Avoids JS floating-point serialization surprises (e.g. 1850000.0000000002).
 */
function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/**
 * GET /api/finance/accounts
 *
 * Returns FinAccount records available for Bank Book / Cash Book UI.
 *
 * Query params:
 *   type       - CASH | BANK | ALL  (default: ALL)
 *   branchId   - filter by branchName (FinAccount has no FK branch; branchId is treated as branchName)
 *   activeOnly - true | false  (default: true)
 *
 * Permission: canManageFinance (Accounts, Operations Head, Manager)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFinance(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const typeParam   = (sp.get("type") ?? "ALL").toUpperCase();
  const branchParam = sp.get("branchId") ?? null;
  const activeOnly  = sp.get("activeOnly") !== "false"; // default true

  if (!["CASH", "BANK", "ALL"].includes(typeParam)) {
    return NextResponse.json(
      { error: "type must be CASH, BANK, or ALL" },
      { status: 400 },
    );
  }

  const where: Record<string, unknown> = {};

  if (typeParam === "BANK")      where.type = "bank";
  else if (typeParam === "CASH") where.type = "cash";
  // ALL → no type filter

  // FinAccount has no FK branch relation; branchId is treated as branchName.
  if (branchParam) where.branchName = branchParam;
  if (activeOnly)  where.isActive   = true;

  const accounts = await prisma.finAccount.findMany({
    where,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const data = accounts.map((a) => ({
    id: String(a.id),
    accountCode: `ACC-${String(a.id).padStart(4, "0")}`,
    accountName: a.name,
    accountType: a.type.toUpperCase() as "BANK" | "CASH",
    // No FK branch entity exists; branchName is the identifier.
    branchId: a.branchName,
    branchName: a.branchName,
    bankName: a.bankName,
    accountNo: a.accountNo,
    ifscCode: a.ifscCode,
    accountHolder: a.accountHolder,
    openingBalance: fmtMoney(a.openingBalance),
    currentBalance: fmtMoney(a.currentBalance),
    status: a.isActive ? "ACTIVE" : "INACTIVE",
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    success: true,
    data: { accounts: data },
  });
}
