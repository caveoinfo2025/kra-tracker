import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const kra = await prisma.kRA.findUnique({
    where: { id: Number(id) },
    include: { reviews: { orderBy: { createdAt: "desc" } } },
  });
  if (!kra) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(kra);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, description, target, deadline, weight, status } = body;
  const kra = await prisma.kRA.update({
    where: { id: Number(id) },
    data: {
      title,
      description,
      target,
      deadline: deadline ? new Date(deadline) : undefined,
      weight,
      status,
    },
  });
  return NextResponse.json(kra);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.kRA.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
