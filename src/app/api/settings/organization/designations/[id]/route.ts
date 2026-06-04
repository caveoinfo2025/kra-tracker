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
  const { companyId, title, level, description } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Designation title is required." }, { status: 400 });

  try {
    const updated = await prisma.designation.update({
      where: { id: Number(id) },
      data: {
        companyId: Number(companyId),
        title: title.trim(),
        level: level ? Number(level) : 1,
        description: description?.trim() ?? "",
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
    const updated = await prisma.designation.update({ where: { id: Number(id) }, data: { status } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Database not ready." }, { status: 503 });
  }
}
