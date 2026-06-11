import prisma from "@/lib/prisma";

export interface ConnectionRow {
  id:             number;
  providerId:     number;
  companyId:      number | null;
  connectionName: string;
  authType:       string;
  configJson:     string;
  secretRef:      string | null;
  status:         string;
  lastTestedAt:   Date | null;
  lastTestStatus: string | null;
  createdAt:      Date;
  updatedAt:      Date;
  provider?: { name: string; code: string; category: string };
}

export async function listConnections(companyId?: number): Promise<ConnectionRow[]> {
  return prisma.integrationConnection.findMany({
    where: companyId ? { companyId } : undefined,
    include: { provider: { select: { name: true, code: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getConnection(id: number): Promise<ConnectionRow | null> {
  return prisma.integrationConnection.findUnique({
    where: { id },
    include: { provider: { select: { name: true, code: true, category: true } } },
  });
}

export async function createConnection(data: {
  providerId:     number;
  companyId?:     number;
  connectionName: string;
  authType:       string;
  configJson?:    string;
  secretRef?:     string;
}): Promise<ConnectionRow> {
  return prisma.integrationConnection.create({
    data: {
      providerId:     data.providerId,
      companyId:      data.companyId ?? null,
      connectionName: data.connectionName,
      authType:       data.authType,
      configJson:     data.configJson ?? "{}",
      secretRef:      data.secretRef ?? null,
      status:         "INACTIVE",
    },
    include: { provider: { select: { name: true, code: true, category: true } } },
  });
}

export async function updateConnection(
  id: number,
  data: Partial<{
    connectionName: string;
    authType:       string;
    configJson:     string;
    secretRef:      string;
    status:         string;
  }>,
): Promise<ConnectionRow> {
  return prisma.integrationConnection.update({
    where: { id },
    data,
    include: { provider: { select: { name: true, code: true, category: true } } },
  });
}

export async function recordTestResult(
  id: number,
  success: boolean,
): Promise<void> {
  await prisma.integrationConnection.update({
    where: { id },
    data: {
      lastTestedAt:   new Date(),
      lastTestStatus: success ? "SUCCESS" : "FAILED",
    },
  });
}
