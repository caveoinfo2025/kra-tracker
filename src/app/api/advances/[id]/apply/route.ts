/**
 * POST /api/advances/[id]/apply
 * Body: { collectionId }
 * Applies an unapplied advance to an invoice — creates a Payment from it,
 * marks the advance applied, and fires payment notifications.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { applyAdvance } from "@/lib/payments";
import prisma from "@/lib/prisma";
import { canManagePayments } from "@/lib/roles";
import { moneyToNumberForDisplay } from "@/lib/money";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePayments(session.user)) {
    return NextResponse.json({ error: "Only Accounts or managers can apply advances" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const collectionId = Number(body.collectionId);
  if (!collectionId) return NextResponse.json({ error: "collectionId required" }, { status: 400 });

  const coll = await prisma.collection.findFirst({ where: { id: collectionId, deletedAt: null } });
  if (!coll) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const result = await applyAdvance(Number(id), collectionId, session.user.employeeId!);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
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
    { status: 200 }
  );
}
