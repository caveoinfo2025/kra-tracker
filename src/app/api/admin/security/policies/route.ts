import { NextResponse } from "next/server";
import { getSession }   from "@/lib/dev-session";
import prisma           from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const policies = await prisma.securityPolicy.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(policies);
}
