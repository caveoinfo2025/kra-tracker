/**
 * GET /api/admin/policies/[id]/versions — list version history for a policy
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Policy", "VIEW");
  if (deny) return deny;

  const { id } = await params;
  const policyId = parseInt(id);
  if (isNaN(policyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const versions = await db.policyVersion.findMany({
      where: { policyId },
      orderBy: { versionNumber: "desc" },
      select: {
        id:            true,
        versionNumber: true,
        changeReason:  true,
        snapshotJson:  true,
        createdAt:     true,
        creator: { select: { name: true } },
      },
    }) as Array<Record<string, any>>;

    return NextResponse.json(
      versions.map((v) => ({
        id:            v.id            as number,
        versionNumber: v.versionNumber as number,
        changeReason:  (v.changeReason as string | null) ?? "",
        createdBy:     (v.creator as { name: string } | null)?.name ?? "Unknown",
        createdAt:     new Date(v.createdAt).toISOString(),
        snapshotJson:  v.snapshotJson  as string,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
