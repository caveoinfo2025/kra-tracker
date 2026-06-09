import prisma from "@/lib/prisma";

export type CommunicationAuditInput = {
  entityType: string;
  entityId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  performedBy: number;
};

export async function logCommunicationAudit(input: CommunicationAuditInput) {
  try {
    return await prisma.communicationAudit.create({
      data: {
        entityType:  input.entityType,
        entityId:    input.entityId,
        action:      input.action,
        oldValue:    input.oldValue ?? "",
        newValue:    input.newValue ?? "",
        performedBy: input.performedBy,
      },
    });
  } catch {
    return null;
  }
}

export async function listCommunicationAudit(filters?: {
  entityType?: string;
  entityId?: number;
  performedBy?: number;
}) {
  try {
    return await prisma.communicationAudit.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  } catch {
    return [];
  }
}
