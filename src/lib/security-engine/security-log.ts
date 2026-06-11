import prisma from "@/lib/prisma";

export type SecurityEventType =
  | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT"
  | "PASSWORD_CHANGED" | "ROLE_CHANGED"
  | "EXPORT_REQUESTED" | "EXPORT_APPROVED" | "EXPORT_BLOCKED"
  | "ACCESS_DENIED" | "MFA_CHALLENGED" | "MFA_PASSED" | "MFA_FAILED"
  | "POLICY_CHANGED" | "SESSION_EXPIRED" | "ACCOUNT_LOCKED";

export interface SecurityEventLogRow {
  id:           number;
  userId:       number | null;
  eventType:    string;
  metadataJson: string;
  ipAddress:    string | null;
  userAgent:    string | null;
  createdAt:    Date;
}

export async function logSecurityEvent(data: {
  userId?:    number;
  eventType:  SecurityEventType;
  metadata?:  Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.securityEventLog.create({
      data: {
        userId:       data.userId       ?? null,
        eventType:    data.eventType,
        metadataJson: JSON.stringify(data.metadata ?? {}),
        ipAddress:    data.ipAddress    ?? null,
        userAgent:    data.userAgent    ?? null,
      },
    });
  } catch {
    // Security logging must never block the calling flow
  }
}

export async function listSecurityLogs(opts?: {
  userId?:    number;
  eventType?: string;
  limit?:     number;
  offset?:    number;
}): Promise<SecurityEventLogRow[]> {
  return prisma.securityEventLog.findMany({
    where: {
      ...(opts?.userId    ? { userId: opts.userId }       : {}),
      ...(opts?.eventType ? { eventType: opts.eventType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take:   opts?.limit  ?? 100,
    skip:   opts?.offset ?? 0,
  });
}

export async function countRecentFailedLogins(
  userId: number,
  windowMinutes = 30,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  return prisma.securityEventLog.count({
    where: {
      userId,
      eventType: "LOGIN_FAILED",
      createdAt: { gte: since },
    },
  });
}
