import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-log";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
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
  const session = await getSession();
  // Only managers can update employee records
  if (!session?.user?.isManager) return forbidden();

  const body = await req.json();
  const { name, email, department, role, isManager, msEmail, reportsToId, departmentId, designationId } = body;

  // Guard against self-reporting cycles
  const reportsTo =
    reportsToId === undefined ? undefined
    : reportsToId && Number(reportsToId) !== Number(id) ? Number(reportsToId)
    : null;

  // Phase W11.3 — snapshot the current manager before overwriting it, so a genuine change can be
  // audited (and a no-op resave of the same value is never logged as a "change").
  const before = reportsToId !== undefined
    ? await prisma.employee.findUnique({ where: { id: Number(id) }, select: { reportsToId: true, name: true } })
    : null;

  const employee = await prisma.employee.update({
    where: { id: Number(id) },
    data: {
      name,
      email,
      department,
      role,
      ...(isManager   !== undefined && { isManager }),
      ...(msEmail     !== undefined && { msEmail: msEmail || null }),
      ...(reportsToId !== undefined && { reportsToId: reportsTo }),
    },
  });

  // Keep EmployeeProfile FK links in sync
  if (departmentId !== undefined || designationId !== undefined || reportsToId !== undefined) {
    await prisma.employeeProfile.upsert({
      where:  { userId: employee.id },
      update: {
        ...(departmentId  !== undefined && { departmentId:      departmentId  ? Number(departmentId)  : null }),
        ...(designationId !== undefined && { designationId:     designationId ? Number(designationId) : null }),
        ...(reportsToId   !== undefined && { reportingManagerId: reportsTo ?? null }),
      },
      create: {
        userId: employee.id,
        employmentStatus: "ACTIVE",
        ...(departmentId  && { departmentId:      Number(departmentId)  }),
        ...(designationId && { designationId:     Number(designationId) }),
        ...(reportsTo     && { reportingManagerId: reportsTo }),
      },
    });
  }

  // Phase W11.3 — audit only a GENUINE reporting-manager change (before !== after), never a
  // no-op resave. Fire-and-forget, same convention as every other audit call in this codebase.
  if (before && before.reportsToId !== reportsTo) {
    const [oldManager, newManager] = await Promise.all([
      before.reportsToId ? prisma.employee.findUnique({ where: { id: before.reportsToId }, select: { name: true } }) : null,
      reportsTo ? prisma.employee.findUnique({ where: { id: reportsTo }, select: { name: true } }) : null,
    ]);
    logAuditEvent({
      entityType: "Employee",
      entityId: employee.id,
      action: "UPDATED",
      performedById: session?.user?.employeeId ?? 0,
      changes: {
        entityName: before.name,
        field: "reportingManager",
        oldValue: `Manager: ${oldManager?.name ?? "None"}`,
        newValue: `Manager: ${newManager?.name ?? "None"}`,
      },
    }).catch(() => {});
  }

  return NextResponse.json(employee);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.isManager) return forbidden();

  await prisma.employee.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
