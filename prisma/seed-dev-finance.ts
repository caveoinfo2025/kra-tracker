/**
 * DEV-ONLY seed — sample finance transactional data for inspection.
 *
 * Creates a coherent slice across the finance models:
 *   2 Vendors → 1 Expense (approved, vouchered) → 1 Voucher (CI/26-27/NNNNN)
 *   → 1 Ledger entry (cash payment) → 1 EmployeeAdvance → 1 TravelClaim
 *   → 1 AuditLog entry.
 *
 * Depends on the finance config seed (FinAccount, VoucherSequence) and the
 * dev-users seed (employees). Guarded: only runs if no Vendor rows exist yet,
 * so re-running won't duplicate or burn voucher numbers.
 *
 * Run against a DEV database only:
 *   npx tsx prisma/seed-dev-finance.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const url = new URL(process.env.DATABASE_URL!.replace(/\\(.)/g, "$1"));
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  }),
});

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const FY = "26-27";

async function emp(email: string) {
  return prisma.employee.findUniqueOrThrow({ where: { email } });
}

/** Atomically pull the next voucher number: CI/26-27/00001 */
async function nextVoucherNo(): Promise<string> {
  const seq = await prisma.voucherSequence.update({
    where: { financialYear: FY },
    data: { lastNumber: { increment: 1 } },
  });
  return `CI/${FY}/${String(seq.lastNumber).padStart(5, "0")}`;
}

async function main() {
  if ((await prisma.vendor.count()) > 0) {
    console.log("Vendors already exist — sample finance data skipped (guard).");
    return;
  }

  const head = await emp("vijesh@caveoinfosystems.com");        // Head of Sales (approver/creator)
  const accounts = await emp("priyadharshini.accounts@caveoinfosystems.com"); // records ledger
  const bde = await emp("priya.bde@caveoinfosystems.com");      // expense owner
  const isr = await emp("rahul.isr@caveoinfosystems.com");      // advance + travel claim
  const cash = await prisma.finAccount.findFirstOrThrow({ where: { type: "cash" } });

  // ── Vendors ──
  const abc = await prisma.vendor.create({
    data: {
      name: "ABC Office Supplies Pvt Ltd", gstin: "33ABCDE1234F1Z5", pan: "ABCDE1234F",
      address: "12 Mount Road", city: "Chennai", state: "Tamil Nadu", pincode: "600002",
      contactName: "S. Ramesh", contactPhone: "9840012345", contactEmail: "sales@abcoffice.in",
      paymentTerms: "30 days",
    },
  });
  await prisma.vendor.create({
    data: {
      name: "SpeedTravels & Logistics", gstin: "29SPEED5678G1Z3", pan: "SPEED5678G",
      city: "Bangalore", state: "Karnataka", pincode: "560001", paymentTerms: "15 days",
    },
  });

  // ── Expense (incl 18% GST) ──
  const total = 0.3;                      // ₹0.30 L incl GST
  const base = total / 1.18;
  const gst = round4(total - base);
  const expense = await prisma.expense.create({
    data: {
      category: "Office Supplies", categoryCode: "OFS",
      vendorId: abc.id, customerName: "Infosys Ltd",
      employeeId: bde.id, expenseDate: new Date(),
      amountLakhs: total, gstRate: 18, gstAmountLakhs: gst,
      narration: "Printer cartridges and stationery for the Infosys account review",
      vendorInvoiceNo: "ABC/2026/0457",
      attachmentsJson: JSON.stringify([{ fileName: "abc-invoice-0457.pdf", fileUrl: "https://example.invalid/abc-invoice-0457.pdf" }]),
      status: "approved", approvedById: head.id, approvedAt: new Date(),
    },
  });

  // ── Voucher (CI/26-27/00001) linked to the expense ──
  const voucherNo = await nextVoucherNo();
  const voucher = await prisma.voucher.create({
    data: {
      voucherNo, type: "expense", amountLakhs: total,
      narration: `Expense voucher for ${expense.vendorInvoiceNo} (Office Supplies)`,
      status: "approved", createdById: head.id,
    },
  });
  await prisma.expense.update({ where: { id: expense.id }, data: { voucherId: voucher.id } });

  // ── Ledger: cash payment out of HO Cash for the expense ──
  const ledger = await prisma.ledger.create({
    data: {
      accountId: cash.id, type: "cash_out", direction: "credit", amountLakhs: total,
      narration: `Cash paid for ${expense.vendorInvoiceNo}`,
      referenceNo: "CASH-0001", voucherId: voucher.id, recordedById: accounts.id,
    },
  });
  // keep the cached account balance consistent (service would normally do this)
  await prisma.finAccount.update({
    where: { id: cash.id },
    data: { currentBalance: { decrement: total } },
  });

  // ── Employee advance (approved, awaiting disbursement) ──
  await prisma.employeeAdvance.create({
    data: {
      advanceNo: `CI/ADV/${FY}/00001`, employeeId: isr.id,
      purpose: "Travel advance for the Coimbatore customer visits (3 days)",
      amountLakhs: 0.5, status: "approved", approvedById: head.id, approvedAt: new Date(),
      balanceLakhs: 0,
    },
  });

  // ── Travel claim (local conveyance, submitted) ──
  const km = 18.4, rate = 2.0;
  const rupees = round4(km * rate);
  await prisma.travelClaim.create({
    data: {
      claimNo: `CI/TRV/${FY}/00001`, employeeId: bde.id, travelDate: new Date(),
      fromLocation: "Caveo Office, Koramangala, Bangalore",
      toLocation: "Infosys Campus, Electronic City, Bangalore",
      fromLat: 12.9352, fromLng: 77.6245, toLat: 12.8452, toLng: 77.6602,
      distanceKm: km, mode: "bike", ratePerKm: rate,
      amountRupees: rupees, amountLakhs: round4(rupees / 100000),
      purpose: "Client meeting — Infosys account review", status: "submitted",
    },
  });

  // ── Audit log for the voucher ──
  await prisma.auditLog.create({
    data: {
      entityType: "voucher", entityId: voucher.id, action: "create",
      performedById: head.id,
      changes: JSON.stringify({ voucherNo, amountLakhs: total, type: "expense" }),
      notes: "Auto-generated on expense approval (sample data).",
    },
  });

  console.log("Sample finance data created:");
  console.log(`  Vendors:        2 (ABC Office Supplies, SpeedTravels)`);
  console.log(`  Expense:        #${expense.id}  ₹${total} L incl 18% GST (₹${gst} L GST) → ${voucherNo}`);
  console.log(`  Voucher:        ${voucherNo} (expense, approved)`);
  console.log(`  Ledger:         #${ledger.id}  cash_out ₹${total} L from "${cash.name}"`);
  console.log(`  EmployeeAdvance:CI/ADV/${FY}/00001  ₹0.5 L (approved)`);
  console.log(`  TravelClaim:    CI/TRV/${FY}/00001  ${km} km × ₹${rate}/km = ₹${rupees}`);
  console.log(`  AuditLog:       1 entry (voucher create)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
