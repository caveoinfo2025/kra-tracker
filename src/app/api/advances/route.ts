/**
 * GET  /api/advances?status=unapplied — list order advances (credits)
 * POST /api/advances                   — record an advance against a Closed Won order
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManagePayments } from "@/lib/roles";
import { parseMoneyInput, moneyToNumberForDisplay, isPositiveMoney } from "@/lib/money";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // unapplied | applied | (all)
  const customer = searchParams.get("customer");

  const advances = await prisma.orderAdvance.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(customer ? { customerName: { contains: customer } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      recordedBy: { select: { name: true } },
      customer: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(advances.map((a) => ({ ...a, amountLakhs: moneyToNumberForDisplay(a.amountLakhs) })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePayments(session.user)) {
    return NextResponse.json({ error: "Only Accounts or managers can record advances" }, { status: 403 });
  }

  const body = await req.json();
  const amountLakhs = parseMoneyInput(body.amountLakhs);
  const customerName = (body.customerName ?? "").toString().trim();
  if (!customerName || !isPositiveMoney(amountLakhs)) {
    return NextResponse.json({ error: "customerName and a positive amount are required" }, { status: 400 });
  }

  const advance = await prisma.orderAdvance.create({
    data: {
      salesFunnelId: body.salesFunnelId ? Number(body.salesFunnelId) : null,
      customerName,
      customerId: body.customerId ? Number(body.customerId) : null,
      amountLakhs,
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
      mode: body.mode ?? "Bank Transfer",
      referenceNo: body.referenceNo ?? "",
      notes: body.notes ?? "",
      status: "unapplied",
      recordedById: session.user.employeeId!,
    },
    include: {
      recordedBy: { select: { name: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ...advance, amountLakhs: moneyToNumberForDisplay(advance.amountLakhs) }, { status: 201 });
}
