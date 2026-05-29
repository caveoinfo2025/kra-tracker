import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const kra = await prisma.kRA.findUnique({
    where: { id: Number(id) },
    include: { reviews: { orderBy: { createdAt: "desc" } } },
  });
  if (!kra) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Employees can only view their own KRAs
  if (!session.user.isManager && kra.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(kra);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.kRA.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, target, deadline, weight, status } = body;
  const kra = await prisma.kRA.update({
    where: { id: Number(id) },
    data: {
      title,
      description,
      target,
      deadline: deadline ? new Date(deadline) : undefined,
      weight,
      status,
    },
  });
  return NextResponse.json(kra);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.kRA.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.kRA.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
