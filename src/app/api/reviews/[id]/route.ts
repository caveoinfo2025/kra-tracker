import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { progress, score, notes, blockers } = body;
  const review = await prisma.weeklyReview.update({
    where: { id: Number(id) },
    data: { progress: Number(progress), score: Number(score), notes, blockers },
    include: { kra: true },
  });
  return NextResponse.json(review);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.weeklyReview.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
