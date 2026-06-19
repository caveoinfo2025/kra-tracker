import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body  = await req.json();
  const empId = session.user.employeeId!;

  const task = await prisma.crmTask.findUnique({ where: { id: Number(id) } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && task.assignedToId !== empId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.crmTask.update({
    where: { id: Number(id) },
    data: {
      title:       body.title       ?? undefined,
      description: body.description ?? undefined,
      dueDate:     body.dueDate     ? new Date(body.dueDate) : undefined,
      status:      body.status      ?? undefined,
      priority:    body.priority    ?? undefined,
    },
    include: {
      assignedTo:  { select: { id: true, name: true } },
      lead:        { select: { id: true, title: true, companyName: true } },
      opportunity: { select: { id: true, stage: true } },
    },
  });

  if (body.status === "completed" && task.leadId) {
    await prisma.crmActivity.create({
      data: {
        entityType:    "task",
        entityId:      task.id,
        action:        "task_completed",
        description:   `Task completed: ${task.title}`,
        performedById: empId,
        leadId:        task.leadId,
        opportunityId: task.opportunityId,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.crmTask.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
