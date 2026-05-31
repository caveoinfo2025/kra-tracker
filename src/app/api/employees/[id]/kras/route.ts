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

  // Employees can only view their own KRAs; managers can view any
  if (!session.user.isManager && session.user.employeeId !== targetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kras = await prisma.kRA.findMany({
    where: { employeeId: targetId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(kras);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);

  // Only managers can create KRAs for others; employees can only create their own
  if (!session.user.isManager && session.user.employeeId !== targetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      employeeId: targetId,
    },
  });
  return NextResponse.json(kra, { status: 201 });
}
