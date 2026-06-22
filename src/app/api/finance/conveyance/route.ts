import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canViewAllConveyance } from "@/lib/finance/access";
import { moneyToNumberForDisplay } from "@/lib/money";

/**
 * GET /api/finance/conveyance
 *
 * Read-only list of TravelClaim rows (local conveyance trips), scoped:
 * Step 3Q (Release 1): ratePerKm/amountRupees are Decimal ₹/real-INR (unchanged in
 * value, only the column type changed); response shape stays a plain number.
 *   - Employees see only their own claims.
 *   - Finance/Expense/VIEW (closest catalogue fit — no dedicated Conveyance
 *     resource exists), with a temporary canManageFinance() fallback
 *     (Managers / Accounts / Operations Head) see all claims.
 *
 * No write endpoints yet — Add Trip, approve/reject, monthly settlement, and
 * policy config remain client-side mock pending a future schema extension
 * (TravelClaim has no department/grade/customer/project/ticket fields, and
 * there is no MonthlyStatement or PolicyRule table).
 */
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;
  const seesAll = await canViewAllConveyance(session);

  const claims = await prisma.travelClaim.findMany({
    where: { deletedAt: null, ...(seesAll ? {} : { employeeId: user.employeeId! }) },
    include: {
      employee: { select: { id: true, name: true, department: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { travelDate: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      claims: claims.map((c) => ({
        id: String(c.id),
        claimNo: c.claimNo,
        travelDate: c.travelDate.toISOString().slice(0, 10),
        employeeId: c.employeeId,
        employeeName: c.employee.name,
        department: c.employee.department,
        fromLocation: c.fromLocation,
        toLocation: c.toLocation,
        fromLat: c.fromLat,
        fromLng: c.fromLng,
        toLat: c.toLat,
        toLng: c.toLng,
        distanceKm: c.distanceKm,
        mode: c.mode,
        // Step 3Q (Release 1): ratePerKm/amountRupees are now Decimal — convert to a
        // plain number for display rather than leaking a raw Decimal object. No value
        // transformation needed; both fields already store actual INR/real ₹-per-km.
        ratePerKm: moneyToNumberForDisplay(c.ratePerKm),
        amountRupees: moneyToNumberForDisplay(c.amountRupees),
        purpose: c.purpose,
        status: c.status,
        approvedByName: c.approvedBy?.name ?? null,
        approvedAt: c.approvedAt ? c.approvedAt.toISOString() : null,
      })),
    },
  });
}
