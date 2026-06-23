/**
 * GET  /api/payments?collectionId=123  — payment ledger for an invoice
 * POST /api/payments                    — record a payment (Accounts/managers only)
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { recordPayment } from "@/lib/payments";
import { canManagePayments } from "@/lib/roles";
import { parseMoneyInput, moneyToNumberForDisplay, isPositiveMoney } from "@/lib/money";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");
  if (!collectionId) return NextResponse.json({ error: "collectionId required" }, { status: 400 });

  const payments = await prisma.payment.findMany({
    where: { collectionId: Number(collectionId), deletedAt: null },
    orderBy: { paymentDate: "desc" },
    include: { recordedBy: { select: { name: true } } },
  });
  // Decimal → plain number so the response stays a JSON number, not a quoted Decimal string.
  return NextResponse.json(payments.map((p) => ({ ...p, amountLakhs: moneyToNumberForDisplay(p.amountLakhs) })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePayments(session.user)) {
    return NextResponse.json({ error: "Only Accounts or managers can record payments" }, { status: 403 });
  }

  const body = await req.json();
  const collectionId = Number(body.collectionId);
  const amountLakhs = parseMoneyInput(body.amountLakhs);
  if (!collectionId || !isPositiveMoney(amountLakhs)) {
    return NextResponse.json({ error: "collectionId and a positive amount are required" }, { status: 400 });
  }

  const coll = await prisma.collection.findFirst({ where: { id: collectionId, deletedAt: null } });
  if (!coll) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const result = await recordPayment({
    collectionId,
    amountLakhs,
    paymentDate: body.paymentDate ?? null,
    mode: body.mode,
    referenceNo: body.referenceNo,
    notes: body.notes,
    recordedById: session.user.employeeId!,
  });

  return NextResponse.json(
    {
      payment: { ...result.payment, amountLakhs: moneyToNumberForDisplay(result.payment.amountLakhs) },
      collection: result.collection
        ? {
            ...result.collection,
            invoiceValueLakhs: moneyToNumberForDisplay(result.collection.invoiceValueLakhs),
            amountWithoutGstLakhs: moneyToNumberForDisplay(result.collection.amountWithoutGstLakhs),
            amountReceivedLakhs: moneyToNumberForDisplay(result.collection.amountReceivedLakhs),
          }
        : null,
    },
    { status: 201 }
  );
}
