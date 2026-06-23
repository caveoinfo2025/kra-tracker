/**
 * Shared payment / advance / notification logic.
 *
 * Recording a payment:
 *   1. inserts a Payment row
 *   2. re-sums all payments for the invoice and updates the cached
 *      Collection.amountReceivedLakhs + collectionStatus + paymentReceivedDate
 *   3. fans out notifications to the invoice's sales rep and all managers
 *
 * Decimal Release 2 (Step 3U, 2026-06-23): Payment.amountLakhs and Collection.invoiceValueLakhs/
 * amountReceivedLakhs are now Decimal(18,2) storing actual ₹ INR (field names still say "Lakhs",
 * rename deferred — see docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md). All arithmetic
 * below goes through src/lib/money.ts instead of the old float round2()/epsilon-in-Lakhs logic.
 */
import prisma from "@/lib/prisma";
import {
  roundMoney,
  subtractMoney,
  moneyToNumberForDisplay,
  formatMoney,
  isPositiveMoney,
  type MoneyInput,
} from "@/lib/money";

// "Fully Received"/opening-balance tolerance. Pre-migration this was 0.001 ₹L — exactly ₹100 in
// real-world terms (0.001 × 100,000). Expressed directly in INR now so the tolerance's real-world
// meaning is unchanged.
const RECONCILIATION_TOLERANCE_INR = 100;

/** Recompute and persist a Collection's cached totals from its payment ledger. */
export async function syncCollectionTotals(collectionId: number) {
  const [coll, agg, lastPayment] = await Promise.all([
    prisma.collection.findFirst({
      where: { id: collectionId, deletedAt: null },
      select: { invoiceValueLakhs: true },
    }),
    prisma.payment.aggregate({
      where: { collectionId, deletedAt: null },
      _sum: { amountLakhs: true },
    }),
    prisma.payment.findFirst({
      where: { collectionId, deletedAt: null },
      orderBy: { paymentDate: "desc" },
      select: { paymentDate: true },
    }),
  ]);
  if (!coll) return null;

  const received = roundMoney(agg._sum.amountLakhs ?? 0);
  const invoice = roundMoney(coll.invoiceValueLakhs);

  let status = "Pending";
  if (!isPositiveMoney(received)) status = "Pending";
  else if (received.plus(RECONCILIATION_TOLERANCE_INR).greaterThanOrEqualTo(invoice)) status = "Fully Received";
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
  amountLakhs: MoneyInput;
  paymentDate?: string | Date | null;
  mode?: string;
  referenceNo?: string;
  notes?: string;
  recordedById: number;
  fromAdvanceId?: number | null;
}

/**
 * Ensure the payment ledger reflects any pre-existing cached amount that has no
 * corresponding ledger entries (e.g. invoices imported with amountReceivedLakhs
 * already > 0). Without this, the first new payment would OVERWRITE the cached
 * amount instead of adding to it, because syncCollectionTotals re-sums the ledger.
 *
 * If cached amountReceived > current ledger sum, we insert a one-time
 * "Opening balance" payment for the difference so totals add up correctly.
 */
async function reconcileOpeningBalance(collectionId: number, recordedById: number) {
  const [coll, agg] = await Promise.all([
    prisma.collection.findFirst({
      where: { id: collectionId, deletedAt: null },
      select: { amountReceivedLakhs: true, paymentReceivedDate: true, createdAt: true },
    }),
    prisma.payment.aggregate({ where: { collectionId, deletedAt: null }, _sum: { amountLakhs: true } }),
  ]);
  if (!coll) return;

  const cached = roundMoney(coll.amountReceivedLakhs ?? 0);
  const ledgerSum = roundMoney(agg._sum.amountLakhs ?? 0);
  const gap = roundMoney(subtractMoney(cached, ledgerSum));

  if (gap.greaterThan(RECONCILIATION_TOLERANCE_INR)) {
    await prisma.payment.create({
      data: {
        collectionId,
        amountLakhs: gap,
        paymentDate: coll.paymentReceivedDate ?? coll.createdAt ?? new Date(),
        mode: "Opening Balance",
        referenceNo: "",
        notes: "Opening balance (pre-existing received amount)",
        recordedById,
      },
    });
  }
}

/**
 * Record a payment against an invoice, sync the cache, and fire notifications.
 * Returns the created payment + the refreshed collection.
 */
export async function recordPayment(input: RecordPaymentInput) {
  // Capture any pre-existing received amount into the ledger first, so the new
  // payment ADDS to it rather than replacing it.
  await reconcileOpeningBalance(input.collectionId, input.recordedById);

  const payment = await prisma.payment.create({
    data: {
      collectionId: input.collectionId,
      amountLakhs: roundMoney(input.amountLakhs),
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
          title: `Payment received: ${formatMoney(amount, { currency: "INR" })}`,
          body: `${customer} · Invoice ${collection.invoiceNo || "—"}`,
          link: "/collections",
          amountLakhs: moneyToNumberForDisplay(amount),
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
    deletedAt: null,
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
    // DISPLAY ONLY — actual ₹ INR now (field name still says "Lakhs", legacy naming debt).
    totalLakhs: moneyToNumberForDisplay(roundMoney(agg._sum.amountLakhs ?? 0)),
    count: agg._count.id,
    payments: list.map((p) => ({
      id: p.id,
      amountLakhs: moneyToNumberForDisplay(p.amountLakhs),
      customerName: p.collection?.customerName ?? "",
      invoiceNo: p.collection?.invoiceNo ?? "",
      mode: p.mode,
      recordedBy: p.recordedBy?.name ?? "",
      paymentDate: p.paymentDate,
    })),
  };
}
