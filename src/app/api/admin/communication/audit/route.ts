import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const { searchParams } = req.nextUrl;
  const resourceType = searchParams.get("resourceType") ?? undefined;
  const action       = searchParams.get("action")       ?? undefined;

  try {
    const rows = await prisma.communicationAudit.findMany({
      where: {
        ...(resourceType ? { entityType: resourceType } : {}),
        ...(action       ? { action }                   : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    // Map DB column names → frontend field names used by CommunicationAuditView
    const entries = rows.map((r) => ({
      id:           r.id,
      actorType:    "EMPLOYEE",
      actorId:      String(r.performedBy),
      action:       r.action,
      resourceType: r.entityType,
      resourceId:   String(r.entityId),
      detail:       r.newValue || r.oldValue || null,
      createdAt:    r.createdAt,
    }));
    return NextResponse.json(entries);
  } catch (err) {
    console.error("[communication/audit GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
