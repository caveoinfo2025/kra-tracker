/**
 * GET  /api/customers/master  — all customers (HOs with branches nested)
 * POST /api/customers/master  — create customer
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Masters", "CustomerMaster", "VIEW");
  if (deny) return deny;

  const customers = await prisma.customer.findMany({
    where: { parentId: null, deletedAt: null },          // top-level (HO) first
    include: {
      branches: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Also fetch orphan branches just in case
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Masters", "CustomerMaster", "CREATE");
  if (deny) return deny;

  const body = await req.json();
  const { name, address, district, state, pincode, gstNo, officeType, parentId } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      name:       name.trim(),
      address:    address?.trim()    ?? "",
      district:   district?.trim()   ?? "",
      state:      state?.trim()      ?? "",
      pincode:    pincode?.trim()    ?? "",
      gstNo:      gstNo?.trim()      ?? "",
      officeType: officeType         ?? "HO",
      parentId:   parentId           ?? null,
      crmSource:  "manual",
    },
    include: { branches: true },
  });

  return NextResponse.json(customer, { status: 201 });
}
