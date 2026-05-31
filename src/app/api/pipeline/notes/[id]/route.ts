import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const note = await prisma.crmNote.findUnique({ where: { id: Number(id) } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && note.authorId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.crmNote.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
