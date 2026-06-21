/**
 * PATCH  /api/customers/master/[id]  — update
 * DELETE /api/customers/master/[id]  — delete (branches reassigned to null)
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Masters", "CustomerMaster", "EDIT");
  if (deny) return deny;

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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Masters", "CustomerMaster", "DELETE");
  if (deny) return deny;

  const { id } = await params;
  const numId = Number(id);

  const customer = await prisma.customer.findFirst({ where: { id: numId, deletedAt: null } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Step 3D: existing Customer Master UI sends no request body on DELETE — the
  // reason field is supported but optional, falling back to a default so the
  // current delete button keeps working unmodified (see SOFT_DELETE_DECISION_LOG.md).
  const body = await req.json().catch(() => ({} as { deleteReason?: string }));
  const deleteReason = (body.deleteReason ?? "").toString().trim() || "Deleted by user";
  const empId = session.user.employeeId!;

  // Re-parent any branches to null before soft-deleting the HO
  await prisma.customer.updateMany({
    where: { parentId: numId },
    data:  { parentId: null, officeType: "HO" },
  });

  await prisma.customer.update({
    where: { id: numId },
    data: { deletedAt: new Date(), deletedById: empId, deleteReason },
  });

  await prisma.auditLog.create({
    data: {
      entityType:    "customer",
      entityId:      numId,
      action:        "SOFT_DELETE",
      performedById: empId,
      notes:         deleteReason,
      changes: JSON.stringify({
        name:       customer.name,
        address:    customer.address,
        district:   customer.district,
        state:      customer.state,
        gstNo:      customer.gstNo,
        officeType: customer.officeType,
        parentId:   customer.parentId,
      }),
    },
  });

  return NextResponse.json({ ok: true });
}
