import { NextResponse } from "next/server";
import { getSession }   from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import prisma           from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "SecurityAdmin", "EDIT");
  if (deny) return deny;
  const policies = await prisma.securityPolicy.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(policies);
}
