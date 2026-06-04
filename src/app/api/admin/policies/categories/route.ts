/**
 * GET /api/admin/policies/categories — list policy categories
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessSettings(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = await (prisma as any).policyCategory.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }) as Array<{ id: number; code: string; name: string }>;
    return NextResponse.json(cats);
  } catch {
    const { MOCK_CATEGORIES } = await import("@/app/settings/policies/data/policyDefaults");
    return NextResponse.json(MOCK_CATEGORIES);
  }
}
