import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Managers see all; employees only see their own record
  if (session?.user?.isManager) {
    const employees = await prisma.employee.findMany({
      include: { kras: true, reviews: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(employees);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session?.user?.employeeId },
    include: { kras: true, reviews: true },
  });
  return NextResponse.json(employee ? [employee] : []);
}

export async function POST(req: Request) {
  const session = await getSession();
  const deny = await requirePermission(session, "CRM", "Employee", "CREATE");
  if (deny) return deny;

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

