/**
 * GET /api/admin/policies/audit — policy audit log
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Policy", "VIEW");
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const policyId = searchParams.get("policyId") ? parseInt(searchParams.get("policyId")!) : undefined;
  const action   = searchParams.get("action") ?? undefined;

  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const rows = await db.policyAudit.findMany({
      where: {
        ...(policyId ? { policyId } : {}),
        ...(action   ? { action }   : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id:        true,
        policyId:  true,
        action:    true,
        oldValue:  true,
        newValue:  true,
        createdAt: true,
        policy:    { select: { name: true } },
        actor:     { select: { name: true } },
      },
    }) as Array<Record<string, any>>;

    return NextResponse.json(
      rows.map((r) => ({
        id:          r.id          as number,
        policyId:    r.policyId    as number,
        policyName:  (r.policy as { name: string } | null)?.name ?? "Unknown",
        action:      r.action      as string,
        oldValue:    (r.oldValue   as string | null) ?? null,
        newValue:    (r.newValue   as string | null) ?? null,
        performedBy: (r.actor as { name: string } | null)?.name ?? "System",
        createdAt:   new Date(r.createdAt).toISOString(),
      }))
    );
  } catch {
    const { MOCK_AUDIT } = await import("@/app/settings/policies/data/policyDefaults");
    return NextResponse.json(MOCK_AUDIT);
  }
}
