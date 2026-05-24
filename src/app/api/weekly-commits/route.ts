import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = Number(searchParams.get("employeeId"));
  const week = Number(searchParams.get("week"));
  const year = Number(searchParams.get("year"));

  if (!employeeId || !week || !year) {
    return NextResponse.json({ error: "Missing employeeId, week, or year" }, { status: 400 });
  }

  // Non-managers can only fetch their own commits
  if (!session.user.isManager && session.user.employeeId !== employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const commits = await prisma.weeklyCommit.findMany({
    where: { employeeId, week, year },
    include: { kra: { select: { id: true, title: true } } },
  });

  return NextResponse.json(commits);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, kraId, week, year, commitText } = body;

  if (!employeeId || !kraId || !week || !year) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Non-managers can only create commits for themselves
  if (!session.user.isManager && session.user.employeeId !== Number(employeeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert: find existing or create new
  const existing = await prisma.weeklyCommit.findFirst({
    where: { employeeId: Number(employeeId), kraId: Number(kraId), week: Number(week), year: Number(year) },
  });

  let commit;
  if (existing) {
    commit = await prisma.weeklyCommit.update({
      where: { id: existing.id },
      data: { commitText: commitText ?? "" },
    });
  } else {
    commit = await prisma.weeklyCommit.create({
      data: {
        employeeId: Number(employeeId),
        kraId: Number(kraId),
        week: Number(week),
        year: Number(year),
        commitText: commitText ?? "",
      },
    });
  }

  return NextResponse.json(commit);
}
