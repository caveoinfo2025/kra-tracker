import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";

/**
 * Phase W11.3 — Organization Management audit (read-only).
 *
 * GET /api/settings/organization/audit[?entityType=&action=&actor=&limit=]
 *   Reads real `AuditLog` rows written by the Organization Management create routes
 *   (companies/branches/departments/teams/designations) and the reporting-manager change in
 *   `PUT /api/employees/[id]` — via the project's shared `logAuditEvent` helper
 *   (`src/lib/audit-log.ts`), the SAME table already used by pipeline/finance/soft-delete audit
 *   writes elsewhere. Scoped to Organization Management entity types only, so it never surfaces
 *   unrelated audit rows from other domains that share this table. READ-ONLY — never writes.
 */

const ORG_AUDIT_ENTITY_TYPES = ["Company", "Branch", "Department", "Team", "Designation", "Employee"] as const;

const AUDIT_LIMIT_DEFAULT = 50;
const AUDIT_LIMIT_MAX = 200;

async function checkAccess(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  try {
    const allowed = await hasPermission(session.user.employeeId ?? 0, "Settings", "Organization", "VIEW");
    if (allowed) return true;
    return canAccessSettings(session.user);
  } catch {
    return canAccessSettings(session.user);
  }
}

function safeParseChanges(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  if (!await checkAccess()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const entityTypeFilter = sp.get("entityType");
  const actionFilter = sp.get("action");
  const actorFilter = sp.get("actor") ? Number(sp.get("actor")) : undefined;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || AUDIT_LIMIT_DEFAULT, 1), AUDIT_LIMIT_MAX);

  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        entityType: entityTypeFilter && (ORG_AUDIT_ENTITY_TYPES as readonly string[]).includes(entityTypeFilter)
          ? entityTypeFilter
          : { in: [...ORG_AUDIT_ENTITY_TYPES] },
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(actorFilter ? { performedById: actorFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (rows.length === 0) return NextResponse.json({ records: [] });

    const actorIds = [...new Set(rows.map((r) => r.performedById).filter((id) => id > 0))];
    const actors = actorIds.length
      ? await prisma.employee.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const actorName = new Map(actors.map((a) => [a.id, a.name]));

    const records = rows.map((r) => {
      const parsed = safeParseChanges(r.changes);
      return {
        id: r.id,
        entity: r.entityType,
        entityName: typeof parsed.entityName === "string" ? parsed.entityName : `#${r.entityId}`,
        action: r.action,
        actor: actorName.get(r.performedById) ?? (r.performedById > 0 ? `#${r.performedById}` : "System"),
        date: r.createdAt.toISOString(),
        oldValue: typeof parsed.oldValue === "string" ? parsed.oldValue : undefined,
        newValue: typeof parsed.newValue === "string" ? parsed.newValue : undefined,
      };
    });

    return NextResponse.json({ records });
  } catch {
    // AuditLog table not migrated yet, or a transient read error — never break the tab.
    return NextResponse.json({ records: [] });
  }
}
