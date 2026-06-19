/**
 * PATCH  /api/customers/master/[id]  — update
 * DELETE /api/customers/master/[id]  — delete (branches reassigned to null)
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, address, district, state, pincode, gstNo, officeType, parentId } = body;

  const customer = await prisma.customer.update({
    where: { id: Number(id) },
    data: {
      ...(name       !== undefined && { name:       name.trim() }),
      ...(address    !== undefined && { address:    address.trim() }),
      ...(district   !== undefined && { district:   district.trim() }),
      ...(state      !== undefined && { state:      state.trim() }),
      ...(pincode    !== undefined && { pincode:    pincode.trim() }),
      ...(gstNo      !== undefined && { gstNo:      gstNo.trim() }),
      ...(officeType !== undefined && { officeType }),
      ...(parentId   !== undefined && { parentId: parentId ?? null }),
    },
    include: { branches: true },
  });

  return NextResponse.json(customer);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const numId = Number(id);

  // Re-parent any branches to null before deleting the HO
  await prisma.customer.updateMany({
    where: { parentId: numId },
    data:  { parentId: null, officeType: "HO" },
  });

  await prisma.customer.delete({ where: { id: numId } });
  return NextResponse.json({ ok: true });
}
