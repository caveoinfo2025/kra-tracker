import prisma from "@/lib/prisma";

export type PerformanceAuditInput = {
  entityType: string;
  entityId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  performedBy: number;
};

export async function logPerformanceAudit(input: PerformanceAuditInput) {
  try {
    return await prisma.performanceAudit.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue ?? "",
        newValue: input.newValue ?? "",
        performedBy: input.performedBy,
      },
    });
  } catch {
    // audit must never block the main operation
    return null;
  }
}

export async function listPerformanceAudit(filters?: {
  entityType?: string;
  entityId?: number;
  performedBy?: number;
}) {
  try {
    return await prisma.performanceAudit.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}
