import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = Number(searchParams.get("employeeId"));
  const kraId = searchParams.get("kraId") ? Number(searchParams.get("kraId")) : undefined;

  // Non-managers can only fetch their own certifications
  if (!session.user.isManager && session.user.employeeId !== employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const certs = await prisma.certification.findMany({
    where: {
      employeeId: employeeId || undefined,
      kraId: kraId,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(certs);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, kraId, certName, issuingBody, dateObtained, expiryDate, attachmentUrl } = body;

  if (!employeeId || !kraId || !certName || !dateObtained) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Non-managers can only create for themselves
  if (!session.user.isManager && session.user.employeeId !== Number(employeeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cert = await prisma.certification.create({
    data: {
      employeeId: Number(employeeId),
      kraId: Number(kraId),
      certName,
      issuingBody: issuingBody ?? "",
      dateObtained: new Date(dateObtained),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      attachmentUrl: attachmentUrl ?? "",
      status: "pending",
    },
  });

  return NextResponse.json(cert, { status: 201 });
}
