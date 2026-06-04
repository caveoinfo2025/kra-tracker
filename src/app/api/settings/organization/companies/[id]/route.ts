import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";

async function checkEdit(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  const userId = session.user.employeeId ?? 0;
  try {
    const allowed = await hasPermission(userId, "Settings", "Organization", "EDIT");
    if (allowed) return true;
    return canAccessSettings(session.user);
  } catch {
    return canAccessSettings(session.user);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkEdit()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { companyName, legalName, companyCode, gstNumber, panNumber, email, phone, website } = body;

  if (!companyName?.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  try {
    if (companyCode?.trim()) {
      const dup = await prisma.company.findFirst({
        where: { companyCode: companyCode.trim(), NOT: { id: Number(id) } },
      });
      if (dup) return NextResponse.json({ error: "Company code already exists." }, { status: 409 });
    }

    const updated = await prisma.company.update({
      where: { id: Number(id) },
      data: {
        companyName: companyName.trim(),
        legalName: legalName?.trim() ?? "",
        companyCode: companyCode?.trim() ?? "",
        gstNumber: gstNumber?.trim() ?? "",
        panNumber: panNumber?.trim() ?? "",
        email: email?.trim() ?? "",
        phone: phone?.trim() ?? "",
        website: website?.trim() ?? "",
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkEdit()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();
  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const updated = await prisma.company.update({
      where: { id: Number(id) },
      data: { status },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}
