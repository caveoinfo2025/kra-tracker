/**
 * GET /api/pipeline/leads/[id]/activity
 * Returns activity timeline for a specific lead.
 * Used by the mobile Deal Detail screen.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({
    where: { id: Number(id) },
    select: { assignedToId: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activities = await prisma.crmActivity.findMany({
    where: { leadId: Number(id) },
    include: { performedBy: { select: { id: true, name: true } } },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  return NextResponse.json(
    activities.map(a => ({
      id: a.id,
      action: a.action,
      description: a.description,
      createdAt: a.timestamp,
      performedBy: a.performedBy,
    }))
  );
}
