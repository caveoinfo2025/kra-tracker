import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.weeklyReview.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reviews can be updated by the employee themselves or a manager
  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { progress, score, notes, blockers } = body;
  const review = await prisma.weeklyReview.update({
    where: { id: Number(id) },
    data: { progress: Number(progress), score: Number(score), notes, blockers },
    include: { kra: true },
  });
  return NextResponse.json(review);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.weeklyReview.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.weeklyReview.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
