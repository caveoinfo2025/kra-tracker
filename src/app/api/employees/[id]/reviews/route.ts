import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);

  // Employees can only view their own reviews; managers can view any
  if (!session.user.isManager && session.user.employeeId !== targetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reviews = await prisma.weeklyReview.findMany({
    where: { employeeId: targetId },
    include: { kra: true },
    orderBy: [{ year: "desc" }, { week: "desc" }],
  });
  return NextResponse.json(reviews);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);

  // Reviews are typically written by managers; employees can log for themselves
  if (!session.user.isManager && session.user.employeeId !== targetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { kraId, week, year, progress, score, notes, blockers } = body;

  if (!kraId || week === undefined || year === undefined || progress === undefined || score === undefined || !notes) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const review = await prisma.weeklyReview.create({
    data: {
      kraId: Number(kraId),
      employeeId: targetId,
      week: Number(week),
      year: Number(year),
      progress: Number(progress),
      score: Number(score),
      notes,
      blockers: blockers ?? "",
    },
    include: { kra: true },
  });
  return NextResponse.json(review, { status: 201 });
}
