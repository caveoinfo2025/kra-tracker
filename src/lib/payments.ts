/**
 * Shared payment / advance / notification logic.
 *
 * Recording a payment:
 *   1. inserts a Payment row
 *   2. re-sums all payments for the invoice and updates the cached
 *      Collection.amountReceivedLakhs + collectionStatus + paymentReceivedDate
 *   3. fans out notifications to the invoice's sales rep and all managers
 */
import prisma from "@/lib/prisma";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Recompute and persist a Collection's cached totals from its payment ledger. */
export async function syncCollectionTotals(collectionId: number) {
  const [coll, agg, lastPayment] = await Promise.all([
    prisma.collection.findUnique({
      where: { id: collectionId },
      select: { invoiceValueLakhs: true },
    }),
    prisma.payment.aggregate({
      where: { collectionId },
      _sum: { amountLakhs: true },
    }),
    prisma.payment.findFirst({
      where: { collectionId },
      orderBy: { paymentDate: "desc" },
      select: { paymentDate: true },
    }),
  ]);
  if (!coll) return null;

  const received = round2(agg._sum.amountLakhs ?? 0);
  const invoice = coll.invoiceValueLakhs;

  let status = "Pending";
  if (received <= 0) status = "Pending";
  else if (received + 0.001 >= invoice) status = "Fully Received";
  else status = "Partially Received";

  return prisma.collection.update({
    where: { id: collectionId },
    data: {
      amountReceivedLakhs: received,
      collectionStatus: status,
      paymentReceivedDate: lastPayment?.paymentDate ?? null,
    },
    include: { employee: { select: { id: true, name: true } }, payments: true },
  });
}

interface RecordPaymentInput {
  collectionId: number;
  amountLakhs: number;
  paymentDate?: string | Date | null;
  mode?: string;
  referenceNo?: string;
  notes?: string;
  recordedById: number;
  fromAdvanceId?: number | null;
}

/**
 * Record a payment against an invoice, sync the cache, and fire notifications.
 * Returns the created payment + the refreshed collection.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const payment = await prisma.payment.create({
    data: {
      collectionId: input.collectionId,
      amountLakhs: round2(input.amountLakhs),
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
      mode: input.mode ?? "Bank Transfer",
      referenceNo: input.referenceNo ?? "",
      notes: input.notes ?? "",
      fromAdvanceId: input.fromAdvanceId ?? null,
      recordedById: input.recordedById,
    },
  });

  const collection = await syncCollectionTotals(input.collectionId);

  // ── Fan out notifications ──
  if (collection) {
    const amount = payment.amountLakhs;
    const customer = collection.customerName ?? "";
    const recipients = new Set<number>();

    // Sales rep who owns the invoice
    if (collection.employee?.id) recipients.add(collection.employee.id);
    // All managers (covers the manager daily-payment feed)
    const managers = await prisma.employee.findMany({
      where: { isManager: true },
      select: { id: true },
    });
    managers.forEach((m) => recipients.add(m.id));

    if (recipients.size > 0) {
      await prisma.notification.createMany({
        data: [...recipients].map((rid) => ({
          recipientId: rid,
          type: "payment",
          title: `Payment received: ₹${amount.toFixed(2)}L`,
          body: `${customer} · Invoice ${collection.invoiceNo || "—"}`,
          link: "/collections",
          amountLakhs: amount,
        })),
      });
    }
  }

  return { payment, collection };
}

/**
 * Apply an unapplied order advance to an invoice: creates a Payment from the
 * advance and marks the advance as applied.
 */
export async function applyAdvance(advanceId: number, collectionId: number, recordedById: number) {
  const advance = await prisma.orderAdvance.findUnique({ where: { id: advanceId } });
  if (!advance) return { error: "Advance not found" as const };
  if (advance.status === "applied") return { error: "Advance already applied" as const };

  const result = await recordPayment({
    collectionId,
    amountLakhs: advance.amountLakhs,
    paymentDate: new Date(),
    mode: advance.mode,
    referenceNo: advance.referenceNo,
    notes: `Applied advance #${advance.id}` + (advance.notes ? ` — ${advance.notes}` : ""),
    recordedById,
    fromAdvanceId: advance.id,
  });

  await prisma.orderAdvance.update({
    where: { id: advanceId },
    data: {
      status: "applied",
      appliedToCollectionId: collectionId,
      appliedDate: new Date(),
    },
  });

  return result;
}

/**
 * Total payments received today.
 * Pass `employeeId` to scope to a single sales rep's own invoices
 * (Collection.employeeId); omit for a company-wide total.
 */
export async function paymentsToday(employeeId?: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const where = {
    paymentDate: { gte: start, lt: end },
    ...(employeeId ? { collection: { employeeId } } : {}),
  };

  const [agg, list] = await Promise.all([
    prisma.payment.aggregate({
      where,
      _sum: { amountLakhs: true },
      _count: { id: true },
    }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        collection: { select: { customerName: true, invoiceNo: true } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    totalLakhs: round2(agg._sum.amountLakhs ?? 0),
    count: agg._count.id,
    payments: list.map((p) => ({
      id: p.id,
      amountLakhs: p.amountLakhs,
      customerName: p.collection?.customerName ?? "",
      invoiceNo: p.collection?.invoiceNo ?? "",
      mode: p.mode,
      recordedBy: p.recordedBy?.name ?? "",
      paymentDate: p.paymentDate,
    })),
  };
}
