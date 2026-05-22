import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import prisma from "@/lib/prisma";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.isManager && session?.user?.employeeId !== Number(id)) return forbidden();

  const employee = await prisma.employee.findUnique({
    where: { id: Number(id) },
    include: {
      kras: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, include: { kra: true } },
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  // Only managers can update employee records
  if (!session?.user?.isManager) return forbidden();

  const body = await req.json();
  const { name, email, department, role, isManager, msEmail } = body;
  const employee = await prisma.employee.update({
    where: { id: Number(id) },
    data: {
      name,
      email,
      department,
      role,
      ...(isManager !== undefined && { isManager }),
      ...(msEmail !== undefined && { msEmail: msEmail || null }),
    },
  });
  return NextResponse.json(employee);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.isManager) return forbidden();

  await prisma.employee.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
