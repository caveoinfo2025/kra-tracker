import prisma from "@/lib/prisma";

export interface IntegrationLogRow {
  id:                  number;
  connectionId:        number;
  module:              string;
  event:               string;
  requestSummaryJson:  string;
  responseSummaryJson: string;
  status:              string;
  errorMessage:        string | null;
  createdAt:           Date;
  connection?: { connectionName: string; provider: { name: string; code: string } };
}

export async function logIntegrationAttempt(data: {
  connectionId:        number;
  module?:             string;
  event?:              string;
  requestSummary?:     Record<string, unknown>;
  responseSummary?:    Record<string, unknown>;
  status:              "SUCCESS" | "FAILED" | "SKIPPED";
  errorMessage?:       string;
}): Promise<void> {
  try {
    await prisma.integrationLog.create({
      data: {
        connectionId:        data.connectionId,
        module:              data.module ?? "",
        event:               data.event ?? "",
        requestSummaryJson:  JSON.stringify(data.requestSummary ?? {}),
        responseSummaryJson: JSON.stringify(data.responseSummary ?? {}),
        status:              data.status,
        errorMessage:        data.errorMessage ?? null,
      },
    });
  } catch {
    // Logging must never block the calling flow
  }
}

export async function listIntegrationLogs(opts?: {
  connectionId?: number;
  status?:       string;
  limit?:        number;
}): Promise<IntegrationLogRow[]> {
  return prisma.integrationLog.findMany({
    where: {
      ...(opts?.connectionId ? { connectionId: opts.connectionId } : {}),
      ...(opts?.status       ? { status: opts.status }             : {}),
    },
    include: {
      connection: {
        select: {
          connectionName: true,
          provider: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}
