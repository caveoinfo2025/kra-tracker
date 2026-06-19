/**
 * GET /api/kras/me
 * Returns the current user's active KRAs with latest review progress.
 * Used by the mobile app.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const empId = session.user.employeeId;
  if (!empId) return NextResponse.json([], { status: 200 });

  const kras = await prisma.kRA.findMany({
    where: { employeeId: empId, status: "active" },
    include: {
      reviews: {
        orderBy: [{ year: "desc" }, { week: "desc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(kras);
}
