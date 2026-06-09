import prisma from "@/lib/prisma";

export type VoucherConfigRecord = {
  id: number;
  companyId: number | null;
  voucherType: string;
  prefix: string;
  numberFormat: string;
  runningNumber: number;
  financialYearReset: boolean;
  financialYear: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listVoucherConfigs(companyId?: number): Promise<VoucherConfigRecord[]> {
  try {
    return await prisma.voucherConfiguration.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: { voucherType: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createVoucherConfig(data: {
  companyId?: number;
  voucherType: string;
  prefix: string;
  numberFormat?: string;
  financialYearReset?: boolean;
  financialYear?: string;
}): Promise<VoucherConfigRecord> {
  return prisma.voucherConfiguration.create({
    data: {
      companyId: data.companyId ?? null,
      voucherType: data.voucherType,
      prefix: data.prefix,
      numberFormat: data.numberFormat ?? "PREFIX-YEAR-SEQ",
      runningNumber: 0,
      financialYearReset: data.financialYearReset ?? true,
      financialYear: data.financialYear ?? currentFY(),
    },
  });
}

export async function updateVoucherConfig(
  id: number,
  data: Partial<{
    prefix: string;
    numberFormat: string;
    financialYearReset: boolean;
    financialYear: string;
    status: string;
  }>
): Promise<VoucherConfigRecord> {
  return prisma.voucherConfiguration.update({ where: { id }, data });
}

export async function generateVoucherNumber(voucherType: string, companyId?: number): Promise<string> {
  const config = await prisma.voucherConfiguration.findFirst({
    where: { voucherType, status: "active", ...(companyId ? { companyId } : {}) },
  });
  if (!config) return `${voucherType}-${Date.now()}`;

  const fy = currentFY();
  if (config.financialYearReset && config.financialYear !== fy) {
    await prisma.voucherConfiguration.update({
      where: { id: config.id },
      data: { runningNumber: 1, financialYear: fy },
    });
    return formatVoucherNumber(config.prefix, fy, 1, config.numberFormat);
  }

  const next = config.runningNumber + 1;
  await prisma.voucherConfiguration.update({
    where: { id: config.id },
    data: { runningNumber: next },
  });
  return formatVoucherNumber(config.prefix, fy, next, config.numberFormat);
}

function currentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(2)}`;
}

function formatVoucherNumber(prefix: string, fy: string, seq: number, format: string): string {
  const padded = String(seq).padStart(5, "0");
  if (format === "PREFIX-YEAR-SEQ") return `${prefix}/${fy}/${padded}`;
  if (format === "PREFIX-SEQ") return `${prefix}/${padded}`;
  return `${prefix}-${fy}-${padded}`;
}
