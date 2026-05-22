import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviews = await prisma.weeklyReview.findMany({
    where: { employeeId: Number(id) },
    include: { kra: true },
    orderBy: [{ year: "desc" }, { week: "desc" }],
  });
  return NextResponse.json(reviews);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { kraId, week, year, progress, score, notes, blockers } = body;

  if (!kraId || week === undefined || year === undefined || progress === undefined || score === undefined || !notes) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const review = await prisma.weeklyReview.create({
    data: {
      kraId: Number(kraId),
      employeeId: Number(id),
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
