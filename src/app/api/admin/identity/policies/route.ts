/**
 * GET /api/admin/identity/policies?roleId=X
 * Returns all DataAccessPolicy rows for the given role.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";

async function requireSettingsAccess() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!canAccessSettings(session.user)) return { error: "Forbidden", status: 403 as const };
  return { session };
}

export async function GET(req: Request) {
  const check = await requireSettingsAccess();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

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
