import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";
import { logAuditEvent } from "@/lib/audit-log";
import { MOCK_DEPARTMENTS } from "@/app/settings/organization/data/organization.types";

async function checkAccess(write = false): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  try {
    const allowed = await hasPermission(session.user.employeeId ?? 0, "Settings", "Organization", write ? "EDIT" : "VIEW");
    if (allowed) return true;
    return canAccessSettings(session.user);
  } catch {
    return canAccessSettings(session.user);
  }
}

export async function GET() {
  if (!await checkAccess(false)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const depts = await prisma.department.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        company: { select: { companyName: true } },
        _count: { select: { teams: true, employeeProfiles: true } },
      },
    });
    const shaped = depts.map((d) => ({
      id: d.id,
      companyId: d.companyId,
      companyName: d.company.companyName,
      name: d.name,
      code: d.code,
      description: d.description,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      teamCount: d._count.teams,
      employeeCount: d._count.employeeProfiles,
    }));
    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json(MOCK_DEPARTMENTS);
  }
}

export async function POST(req: Request) {
  if (!await checkAccess(true)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await getSession();
  const actorId = session?.user?.employeeId ?? 0;

  const body = await req.json();
  const { companyId, name, code, description } = body;
  if (!companyId || !name?.trim()) {
    return NextResponse.json({ error: "Company and department name are required." }, { status: 400 });
  }

  try {
    const dept = await prisma.department.create({
      data: {
        companyId: Number(companyId),
        name: name.trim(),
        code: code?.trim() ?? "",
        description: description?.trim() ?? "",
        status: "ACTIVE",
      },
    });

    logAuditEvent({
      entityType: "Department",
      entityId: dept.id,
      action: "CREATED",
      performedById: actorId,
      changes: { entityName: dept.name, newValue: dept.code ? `Code: ${dept.code}` : `Status: ${dept.status}` },
    }).catch(() => {});

    return NextResponse.json(dept, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}
