import prisma from "@/lib/prisma";

export interface SessionPolicyRow {
  id:                    number;
  companyId:             number | null;
  idleTimeoutMinutes:    number;
  maxSessionHours:       number;
  allowConcurrentLogin:  boolean;
  maxConcurrentSessions: number;
  rememberMeAllowed:     boolean;
  status:                string;
  createdAt:             Date;
  updatedAt:             Date;
}

export async function getSessionPolicy(companyId?: number): Promise<SessionPolicyRow | null> {
  return prisma.sessionPolicy.findFirst({
    where: { status: "ACTIVE", ...(companyId ? { companyId } : {}) },
    orderBy: { id: "desc" },
  });
}

export async function upsertSessionPolicy(
  data: Partial<Omit<SessionPolicyRow, "id" | "createdAt" | "updatedAt">>,
  existingId?: number,
): Promise<SessionPolicyRow> {
  if (existingId) {
    return prisma.sessionPolicy.update({ where: { id: existingId }, data });
  }
  return prisma.sessionPolicy.create({
    data: {
      idleTimeoutMinutes:    data.idleTimeoutMinutes    ?? 480,
      maxSessionHours:       data.maxSessionHours       ?? 8,
      allowConcurrentLogin:  data.allowConcurrentLogin  ?? true,
      maxConcurrentSessions: data.maxConcurrentSessions ?? 3,
      rememberMeAllowed:     data.rememberMeAllowed     ?? true,
      companyId:             data.companyId             ?? null,
      status:                "ACTIVE",
    },
  });
}

export interface SessionValidationResult {
  valid:   boolean;
  reason?: string;
}

export function validateSession(
  policy: SessionPolicyRow | null,
  sessionAgeMinutes: number,
  idleMinutes: number,
): SessionValidationResult {
  if (!policy) return { valid: true };
  if (idleMinutes > policy.idleTimeoutMinutes)
    return { valid: false, reason: `Idle timeout exceeded (${policy.idleTimeoutMinutes} min)` };
  if (sessionAgeMinutes > policy.maxSessionHours * 60)
    return { valid: false, reason: `Max session duration exceeded (${policy.maxSessionHours}h)` };
  return { valid: true };
}
