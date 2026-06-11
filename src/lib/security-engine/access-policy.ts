import prisma from "@/lib/prisma";

export interface AccessRestrictionPolicyRow {
  id:                      number;
  companyId:               number | null;
  ipRestrictionEnabled:    boolean;
  allowedIpJson:           string;
  businessHourRestriction: boolean;
  allowedHoursJson:        string;
  locationRestrictionJson: string;
  status:                  string;
  createdAt:               Date;
  updatedAt:               Date;
}

export async function getAccessPolicy(companyId?: number): Promise<AccessRestrictionPolicyRow | null> {
  return prisma.accessRestrictionPolicy.findFirst({
    where: { status: "ACTIVE", ...(companyId ? { companyId } : {}) },
    orderBy: { id: "desc" },
  });
}

export async function upsertAccessPolicy(
  data: Partial<Omit<AccessRestrictionPolicyRow, "id" | "createdAt" | "updatedAt">>,
  existingId?: number,
): Promise<AccessRestrictionPolicyRow> {
  if (existingId) {
    return prisma.accessRestrictionPolicy.update({ where: { id: existingId }, data });
  }
  return prisma.accessRestrictionPolicy.create({
    data: {
      ipRestrictionEnabled:    data.ipRestrictionEnabled    ?? false,
      allowedIpJson:           data.allowedIpJson           ?? "[]",
      businessHourRestriction: data.businessHourRestriction ?? false,
      allowedHoursJson:        data.allowedHoursJson        ?? '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
      locationRestrictionJson: data.locationRestrictionJson ?? "{}",
      companyId:               data.companyId               ?? null,
      status:                  "ACTIVE",
    },
  });
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkIPAccess(
  policy: AccessRestrictionPolicyRow | null,
  ip: string,
): AccessCheckResult {
  if (!policy?.ipRestrictionEnabled) return { allowed: true };
  try {
    const allowed: string[] = JSON.parse(policy.allowedIpJson);
    if (allowed.length === 0) return { allowed: true };
    const ok = allowed.some(cidr => ip === cidr || ip.startsWith(cidr.replace(/\/\d+$/, "")));
    return ok ? { allowed: true } : { allowed: false, reason: `IP ${ip} not in allowlist` };
  } catch {
    return { allowed: true };
  }
}

export function checkBusinessHours(
  policy: AccessRestrictionPolicyRow | null,
  now: Date,
): AccessCheckResult {
  if (!policy?.businessHourRestriction) return { allowed: true };
  try {
    const hours = JSON.parse(policy.allowedHoursJson) as {
      start: string; end: string; days: number[];
    };
    const day = now.getDay(); // 0=Sun
    if (!hours.days.includes(day))
      return { allowed: false, reason: "Access not allowed on this day" };
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (hhmm < hours.start || hhmm > hours.end)
      return { allowed: false, reason: `Access only allowed ${hours.start}–${hours.end}` };
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
