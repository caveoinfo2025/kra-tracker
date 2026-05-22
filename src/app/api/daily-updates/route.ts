import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/../auth";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const empId = searchParams.get("employeeId");

  const where = session?.user?.isManager
    ? empId ? { employeeId: Number(empId) } : {}
    : { employeeId: session?.user?.employeeId };

  const rows = await prisma.dailyUpdate.findMany({
    where,
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();
  const employeeId = session?.user?.isManager
    ? Number(body.employeeId ?? session?.user?.employeeId)
    : session?.user?.employeeId;

  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.dailyUpdate.create({
    data: {
      employeeId,
      date: body.date ? new Date(body.date) : new Date(),
      topUpdates: body.topUpdates,
      keyMovement: body.keyMovement ?? "",
      blockers: body.blockers ?? "",
      topDealThisWeek: body.topDealThisWeek ?? "",
      managerSupportRequired: Boolean(body.managerSupportRequired),
      updateStatus: body.updateStatus ?? "On Track",
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}
