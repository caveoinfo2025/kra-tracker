import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";
import { MOCK_TEAMS } from "@/app/settings/organization/data/organization.types";

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
    const teams = await prisma.team.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        department: { select: { name: true } },
        teamLead: { select: { name: true } },
        _count: { select: { employeeProfiles: true } },
      },
    });
    const shaped = teams.map((t) => ({
      id: t.id,
      departmentId: t.departmentId,
      departmentName: t.department.name,
      name: t.name,
      teamLeadId: t.teamLeadId,
      teamLeadName: t.teamLead?.name,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      memberCount: t._count.employeeProfiles,
    }));
    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json(MOCK_TEAMS);
  }
}

export async function POST(req: Request) {
  if (!await checkAccess(true)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { departmentId, name, teamLeadId } = body;
  if (!departmentId || !name?.trim()) {
    return NextResponse.json({ error: "Department and team name are required." }, { status: 400 });
  }

  try {
    const team = await prisma.team.create({
      data: {
        departmentId: Number(departmentId),
        name: name.trim(),
        teamLeadId: teamLeadId ? Number(teamLeadId) : null,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(team, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}
