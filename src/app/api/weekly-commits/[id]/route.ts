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
  const body = await req.json();
  const { commitText } = body;

  const existing = await prisma.weeklyCommit.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Non-managers can only edit their own commits
  if (!session.user.isManager && session.user.employeeId !== existing.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.weeklyCommit.update({
    where: { id: Number(id) },
    data: { commitText: commitText ?? "" },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.weeklyCommit.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Non-managers can only delete their own commits
  if (!session.user.isManager && session.user.employeeId !== existing.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.weeklyCommit.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
