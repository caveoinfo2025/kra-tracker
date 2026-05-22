import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const empId = searchParams.get("employeeId");

  const where = session?.user?.isManager
    ? empId ? { employeeId: Number(empId) } : {}
    : { employeeId: session?.user?.employeeId };

  const rows = await prisma.leadGeneration.findMany({
    where,
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const employeeId = session?.user?.isManager
    ? Number(body.employeeId ?? session?.user?.employeeId)
    : session?.user?.employeeId;

  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.leadGeneration.create({
    data: {
      employeeId,
      date: body.date ? new Date(body.date) : new Date(),
      territory: body.territory ?? "",
      leadSource: body.leadSource ?? "",
      customerName: body.customerName,
      contactPerson: body.contactPerson ?? "",
      phoneEmail: body.phoneEmail ?? "",
      activityType: body.activityType ?? "",
      activityCount: Number(body.activityCount ?? 1),
      leadStatus: body.leadStatus ?? "New",
      qualifiedFlag: Boolean(body.qualifiedFlag),
      nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
      remarks: body.remarks ?? "",
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}

