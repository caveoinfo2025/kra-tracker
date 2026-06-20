/**
 * GET /api/admin/identity/policies?roleId=X
 * Returns all DataAccessPolicy rows for the given role.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "VIEW");
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const roleId = parseInt(searchParams.get("roleId") ?? "", 10);
  if (isNaN(roleId)) return NextResponse.json({ error: "roleId is required" }, { status: 400 });

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const policies = await prisma.dataAccessPolicy.findMany({
      where:   { roleId },
      orderBy: { module: "asc" },
      select:  { id: true, module: true, scope: true },
    });

    return NextResponse.json(policies);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
