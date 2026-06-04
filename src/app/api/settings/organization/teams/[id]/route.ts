import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";

async function checkEdit(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  try {
    const ok = await hasPermission(session.user.employeeId ?? 0, "Settings", "Organization", "EDIT");
    if (ok) return true;
    return canAccessSettings(session.user);
  } catch {
    return canAccessSettings(session.user);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkEdit()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { departmentId, name, teamLeadId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Team name is required." }, { status: 400 });

  try {
    const updated = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        departmentId: Number(departmentId),
        name: name.trim(),
        teamLeadId: teamLeadId ? Number(teamLeadId) : null,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Database not ready." }, { status: 503 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkEdit()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { status } = await req.json();
  if (!["ACTIVE", "INACTIVE"].includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  try {
    const updated = await prisma.team.update({ where: { id: Number(id) }, data: { status } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Database not ready." }, { status: 503 });
  }
}
