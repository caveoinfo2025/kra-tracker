import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: {
      kras: true,
      reviews: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, department, role } = body;

  if (!name || !email || !department || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: { name, email, department, role },
  });
  return NextResponse.json(employee, { status: 201 });
}
