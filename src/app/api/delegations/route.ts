import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listDelegations, createDelegation } from "@/lib/workflow-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const delegations = await listDelegations({
    userId: searchParams.get("userId") ? Number(searchParams.get("userId")) : session.user.employeeId!,
    module: searchParams.get("module") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json({ delegations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    toUser:     number;
    module?:    string;
    startDate:  string;
    endDate:    string;
    reason?:    string;
  };

  if (!body.toUser || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "toUser, startDate, endDate are required" }, { status: 400 });
  }

  const rule = await createDelegation({
    fromUser:  session.user.employeeId!,
    toUser:    body.toUser,
    module:    body.module,
    startDate: new Date(body.startDate),
    endDate:   new Date(body.endDate),
    reason:    body.reason,
    createdBy: session.user.employeeId!,
  });

  if (!rule) return NextResponse.json({ error: "Failed to create delegation" }, { status: 503 });
  return NextResponse.json({ rule }, { status: 201 });
}
