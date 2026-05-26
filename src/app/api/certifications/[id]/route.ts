import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.certification.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Employee can only edit their own pending certifications; manager can edit any
  if (!session.user.isManager) {
    if (session.user.employeeId !== existing.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Cannot edit a non-pending certification" }, { status: 400 });
    }
  }

  const updated = await prisma.certification.update({
    where: { id: Number(id) },
    data: {
      certName: body.certName ?? existing.certName,
      issuingBody: body.issuingBody ?? existing.issuingBody,
      dateObtained: body.dateObtained ? new Date(body.dateObtained) : existing.dateObtained,
      expiryDate: body.expiryDate !== undefined
        ? (body.expiryDate ? new Date(body.expiryDate) : null)
        : existing.expiryDate,
      attachmentUrl: body.attachmentUrl ?? existing.attachmentUrl,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.certification.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager) {
    if (session.user.employeeId !== existing.employeeId || existing.status !== "pending") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.certification.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
