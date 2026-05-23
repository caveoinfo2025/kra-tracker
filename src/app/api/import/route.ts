import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/[,₹\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function parseStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function matchEmployee(
  name: string,
  employees: { id: number; name: string; email: string }[]
): number | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const exact = employees.find((e) => e.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = employees.find(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      lower.includes(e.name.toLowerCase())
  );
  return partial?.id ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ErrorRow = {
  row: number;      // 1-based row number in the uploaded file
  reason: string;   // human-readable reason for skipping
  customer: string; // customerName for identification
  ref: string;      // invoiceNo or opportunityName
};

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, mapping, rows, defaultEmployeeName } = await req.json() as {
    type: "sales" | "collections";
    mapping: Record<string, string>;
    rows: Record<string, unknown>[];
    defaultEmployeeName?: string;
  };

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, email: true },
  });

  const defaultEmpId = defaultEmployeeName
    ? matchEmployee(defaultEmployeeName, employees)
    : null;

  // Invert mapping: fieldKey → value from row
  const field = (key: string, row: Record<string, unknown>): unknown => {
    const header = Object.entries(mapping).find(([, f]) => f === key)?.[0];
    return header ? row[header] : undefined;
  };

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: ErrorRow[] = [];

  // ─── Sales / Bookings ─────────────────────────────────────────────────────
  if (type === "sales") {
    for (const [idx, row] of rows.entries()) {
      const rowNum = idx + 1;
      const customerName = parseStr(field("customerName", row));
      const opportunityName = parseStr(field("opportunityName", row));

      // Validate required fields
      const missing: string[] = [];
      if (!customerName) missing.push("Customer Name");
      if (!opportunityName) missing.push("Opportunity / Deal");

      if (missing.length > 0) {
        skipped++;
        errors.push({
          row: rowNum,
          reason: `Missing required: ${missing.join(", ")}`,
          customer: customerName || "—",
          ref: opportunityName || "—",
        });
        continue;
      }

      // Resolve salesperson
      const empName = parseStr(field("employeeName", row));
      const employeeId = matchEmployee(empName, employees) ?? defaultEmpId;
      if (!employeeId) {
        skipped++;
        errors.push({
          row: rowNum,
          reason: empName
            ? `Salesperson "${empName}" not found — check spelling or set a Default Salesperson`
            : "No salesperson in row — set a Default Salesperson above",
          customer: customerName,
          ref: opportunityName,
        });
        continue;
      }

      const data = {
        employeeId,
        customerName,
        opportunityName,
        stage: parseStr(field("stage", row)) || "Lead",
        dealValueLakhs: parseNum(field("dealValueLakhs", row)),
        billingValueLakhs: parseNum(field("billingValueLakhs", row)),
        grossProfitPct: parseNum(field("grossProfitPct", row)),
        territory: parseStr(field("territory", row)),
        solutionCategory: parseStr(field("solutionCategory", row)),
        expectedCloseDate: parseDate(field("expectedCloseDate", row)),
        remarks: parseStr(field("remarks", row)),
      };

      // Upsert: match on customerName + opportunityName + employeeId
      const existing = await prisma.salesFunnel.findFirst({
        where: { customerName, opportunityName, employeeId },
      });

      if (existing) {
        await prisma.salesFunnel.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.salesFunnel.create({
          data: {
            ...data,
            opportunityId: `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          },
        });
        inserted++;
      }
    }

  // ─── Collections ──────────────────────────────────────────────────────────
  } else {
    for (const [idx, row] of rows.entries()) {
      const rowNum = idx + 1;
      const customerName    = parseStr(field("customerName", row));
      const invoiceNo       = parseStr(field("invoiceNo", row));
      const invoiceValueLakhs = parseNum(field("invoiceValueLakhs", row));
      const dueDate         = parseDate(field("dueDate", row));

      // Validate required fields
      const missing: string[] = [];
      if (!customerName)       missing.push("Customer Name");
      if (!invoiceValueLakhs)  missing.push("Invoice Value");
      if (!dueDate)            missing.push("Due Date");

      if (missing.length > 0) {
        skipped++;
        errors.push({
          row: rowNum,
          reason: `Missing required: ${missing.join(", ")}`,
          customer: customerName || "—",
          ref: invoiceNo || "—",
        });
        continue;
      }

      // Resolve salesperson
      const empName = parseStr(field("employeeName", row));
      const employeeId = matchEmployee(empName, employees) ?? defaultEmpId;
      if (!employeeId) {
        skipped++;
        errors.push({
          row: rowNum,
          reason: empName
            ? `Salesperson "${empName}" not found — check spelling or set a Default Salesperson`
            : "No salesperson in row — set a Default Salesperson above",
          customer: customerName,
          ref: invoiceNo || "—",
        });
        continue;
      }

      const data = {
        employeeId,
        customerName,
        invoiceNo,
        invoiceDate: parseDate(field("invoiceDate", row)) ?? new Date(),
        invoiceValueLakhs,
        amountWithoutGstLakhs: parseNum(field("amountWithoutGstLakhs", row)),
        dueDate: dueDate!, // non-null: guarded by missing-fields check above
        amountReceivedLakhs: parseNum(field("amountReceivedLakhs", row)),
        collectionStatus: parseStr(field("collectionStatus", row)) || "Pending",
        remarks: parseStr(field("remarks", row)),
      };

      // Upsert by invoiceNo — only when invoice number is present
      if (invoiceNo) {
        const existing = await prisma.collection.findFirst({
          where: { invoiceNo, employeeId },
        });
        if (existing) {
          await prisma.collection.update({ where: { id: existing.id }, data });
          updated++;
          continue;
        }
      }

      await prisma.collection.create({ data });
      inserted++;
    }
  }

  return NextResponse.json({ inserted, updated, skipped, errors });
}
