import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";
import { logAuditEvent } from "@/lib/audit-log";
import { MOCK_DESIGNATIONS } from "@/app/settings/organization/data/organization.types";

async function checkAccess(write = false): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  try {
    const ok = await hasPermission(session.user.employeeId ?? 0, "Settings", "Organization", write ? "EDIT" : "VIEW");
    if (ok) return true;
    return canAccessSettings(session.user);
  } catch {
    return canAccessSettings(session.user);
  }
}

export async function GET() {
  if (!await checkAccess(false)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const desigs = await prisma.designation.findMany({
      orderBy: [{ level: "desc" }, { title: "asc" }],
      include: {
        company: { select: { companyName: true } },
        _count: { select: { employeeProfiles: true } },
      },
    });
    const shaped = desigs.map((d) => ({
      id: d.id,
      companyId: d.companyId,
      companyName: d.company.companyName,
      title: d.title,
      level: d.level,
      description: d.description,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      employeeCount: d._count.employeeProfiles,
    }));
    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json(MOCK_DESIGNATIONS);
  }
}

export async function POST(req: Request) {
  if (!await checkAccess(true)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await getSession();
  const actorId = session?.user?.employeeId ?? 0;

  const body = await req.json();
  const { companyId, title, level, description } = body;
  if (!companyId || !title?.trim()) {
    return NextResponse.json({ error: "Company and designation title are required." }, { status: 400 });
  }

  try {
    const desig = await prisma.designation.create({
      data: {
        companyId: Number(companyId),
        title: title.trim(),
        level: level ? Number(level) : 1,
        description: description?.trim() ?? "",
        status: "ACTIVE",
      },
    });

    logAuditEvent({
      entityType: "Designation",
      entityId: desig.id,
      action: "CREATED",
      performedById: actorId,
      changes: { entityName: desig.title, newValue: `Level: ${desig.level}` },
    }).catch(() => {});

    return NextResponse.json(desig, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}
