import prisma from "@/lib/prisma";

export interface MFAPolicyRow {
  id:                number;
  companyId:         number | null;
  enabled:           boolean;
  requiredRolesJson: string;
  methodsJson:       string;
  rememberDeviceDays: number;
  status:            string;
  createdAt:         Date;
  updatedAt:         Date;
}

export async function getMFAPolicy(companyId?: number): Promise<MFAPolicyRow | null> {
  return prisma.mFAPolicy.findFirst({
    where: { status: "ACTIVE", ...(companyId ? { companyId } : {}) },
    orderBy: { id: "desc" },
  });
}

export async function upsertMFAPolicy(
  data: Partial<Omit<MFAPolicyRow, "id" | "createdAt" | "updatedAt">>,
  existingId?: number,
): Promise<MFAPolicyRow> {
  if (existingId) {
    return prisma.mFAPolicy.update({ where: { id: existingId }, data });
  }
  return prisma.mFAPolicy.create({
    data: {
      enabled:            data.enabled            ?? false,
      requiredRolesJson:  data.requiredRolesJson   ?? "[]",
      methodsJson:        data.methodsJson         ?? '["EMAIL"]',
      rememberDeviceDays: data.rememberDeviceDays  ?? 30,
      companyId:          data.companyId           ?? null,
      status:             "ACTIVE",
    },
  });
}

export function isMFARequired(policy: MFAPolicyRow | null, userRole: string): boolean {
  if (!policy?.enabled) return false;
  try {
    const requiredRoles: string[] = JSON.parse(policy.requiredRolesJson);
    if (requiredRoles.length === 0) return true; // required for all
    return requiredRoles.some(r => r.toLowerCase() === userRole.toLowerCase());
  } catch {
    return false;
  }
}
