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

// Match employee by name (case-insensitive, partial)
function matchEmployee(
  name: string,
  employees: { id: number; name: string; email: string }[]
): number | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const exact = employees.find((e) => e.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = employees.find((e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()));
  return partial?.id ?? null;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, mapping, rows, defaultEmployeeName } = await req.json() as {
    type: "sales" | "collections";
    mapping: Record<string, string>; // header → fieldKey
    rows: Record<string, unknown>[];
    defaultEmployeeName?: string;
  };

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, email: true },
  });

  const defaultEmpId = defaultEmployeeName
    ? matchEmployee(defaultEmployeeName, employees)
    : null;

  // Invert mapping: fieldKey → header
  const field = (key: string, row: Record<string, unknown>): unknown => {
    const header = Object.entries(mapping).find(([, f]) => f === key)?.[0];
    return header ? row[header] : undefined;
  };

  let inserted = 0;
  let skipped = 0;

  if (type === "sales") {
    for (const row of rows) {
      const customerName = parseStr(field("customerName", row));
      const opportunityName = parseStr(field("opportunityName", row));
      if (!customerName || !opportunityName) { skipped++; continue; }

      const empName = parseStr(field("employeeName", row));
      const employeeId = matchEmployee(empName, employees) ?? defaultEmpId;
      if (!employeeId) { skipped++; continue; }

      await prisma.salesFunnel.create({
        data: {
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
          opportunityId: `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
      });
      inserted++;
    }
  } else {
    for (const row of rows) {
      const customerName = parseStr(field("customerName", row));
      const invoiceValueLakhs = parseNum(field("invoiceValueLakhs", row));
      const dueDate = parseDate(field("dueDate", row));
      if (!customerName || !invoiceValueLakhs || !dueDate) { skipped++; continue; }

      const empName = parseStr(field("employeeName", row));
      const employeeId = matchEmployee(empName, employees) ?? defaultEmpId;
      if (!employeeId) { skipped++; continue; }

      await prisma.collection.create({
        data: {
          employeeId,
          customerName,
          invoiceNo: parseStr(field("invoiceNo", row)),
          invoiceDate: parseDate(field("invoiceDate", row)) ?? new Date(),
          invoiceValueLakhs,
          dueDate,
          amountReceivedLakhs: parseNum(field("amountReceivedLakhs", row)),
          collectionStatus: parseStr(field("collectionStatus", row)) || "Pending",
          remarks: parseStr(field("remarks", row)),
        },
      });
      inserted++;
    }
  }

  return NextResponse.json({ inserted, skipped });
}
