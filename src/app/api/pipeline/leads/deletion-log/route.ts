import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "lead", action: "delete" },
    include: { performedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
