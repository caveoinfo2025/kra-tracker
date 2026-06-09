import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  listEmployeeTargets,
  createEmployeeTarget,
  updateEmployeeTarget,
  listTeamTargets,
  createTeamTarget,
  updateTeamTarget,
} from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") ?? "employee";
  const periodId = req.nextUrl.searchParams.get("periodId");
  const employeeProfileId = req.nextUrl.searchParams.get("employeeProfileId");
  const teamId = req.nextUrl.searchParams.get("teamId");

  if (type === "team") {
    const targets = await listTeamTargets({
      ...(periodId ? { periodId: Number(periodId) } : {}),
      ...(teamId ? { teamId: Number(teamId) } : {}),
    });
    return NextResponse.json(targets);
  }

  const targets = await listEmployeeTargets({
    ...(periodId ? { periodId: Number(periodId) } : {}),
    ...(employeeProfileId ? { employeeProfileId: Number(employeeProfileId) } : {}),
  });
  return NextResponse.json(targets);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const type = body.type ?? "employee";

  if (type === "team") {
    if (!body.teamId || !body.periodId) {
      return NextResponse.json({ error: "teamId and periodId required" }, { status: 400 });
    }
    const target = await createTeamTarget(body as unknown as Parameters<typeof createTeamTarget>[0]);
    return NextResponse.json(target, { status: 201 });
  }

  if (!body.employeeProfileId || !body.periodId) {
    return NextResponse.json({ error: "employeeProfileId and periodId required" }, { status: 400 });
  }
  const target = await createEmployeeTarget(body as unknown as Parameters<typeof createEmployeeTarget>[0]);
  return NextResponse.json(target, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, type, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (type === "team") {
    const target = await updateTeamTarget(Number(id), input);
    return NextResponse.json(target);
  }
  const target = await updateEmployeeTarget(Number(id), input);
  return NextResponse.json(target);
}
