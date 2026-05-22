import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const kras = await prisma.kRA.findMany({
    where: { employeeId: Number(id) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(kras);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, description, target, deadline, weight } = body;

  if (!title || !description || !target || !deadline) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const kra = await prisma.kRA.create({
    data: {
      title,
      description,
      target,
      deadline: new Date(deadline),
      weight: weight ?? 100,
      employeeId: Number(id),
    },
  });
  return NextResponse.json(kra, { status: 201 });
}
