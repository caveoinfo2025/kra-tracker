import prisma from "@/lib/prisma";

export interface PasswordPolicyRow {
  id:                      number;
  companyId:               number | null;
  minimumLength:           number;
  requireUppercase:        boolean;
  requireLowercase:        boolean;
  requireNumber:           boolean;
  requireSpecialCharacter: boolean;
  expiryDays:              number;
  passwordHistoryCount:    number;
  failedAttemptLimit:      number;
  lockDurationMinutes:     number;
  status:                  string;
  createdAt:               Date;
  updatedAt:               Date;
}

export async function getPasswordPolicy(companyId?: number): Promise<PasswordPolicyRow | null> {
  return prisma.passwordPolicy.findFirst({
    where: { status: "ACTIVE", ...(companyId ? { companyId } : {}) },
    orderBy: { id: "desc" },
  });
}

export async function upsertPasswordPolicy(
  data: Partial<Omit<PasswordPolicyRow, "id" | "createdAt" | "updatedAt">>,
  existingId?: number,
): Promise<PasswordPolicyRow> {
  if (existingId) {
    return prisma.passwordPolicy.update({ where: { id: existingId }, data });
  }
  return prisma.passwordPolicy.create({
    data: {
      minimumLength:           data.minimumLength           ?? 8,
      requireUppercase:        data.requireUppercase        ?? true,
      requireLowercase:        data.requireLowercase        ?? true,
      requireNumber:           data.requireNumber           ?? true,
      requireSpecialCharacter: data.requireSpecialCharacter ?? false,
      expiryDays:              data.expiryDays              ?? 90,
      passwordHistoryCount:    data.passwordHistoryCount    ?? 5,
      failedAttemptLimit:      data.failedAttemptLimit      ?? 5,
      lockDurationMinutes:     data.lockDurationMinutes     ?? 30,
      companyId:               data.companyId               ?? null,
      status:                  "ACTIVE",
    },
  });
}

export interface PasswordValidationResult {
  valid:    boolean;
  failures: string[];
}

export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicyRow,
): PasswordValidationResult {
  const failures: string[] = [];
  if (password.length < policy.minimumLength)
    failures.push(`Minimum ${policy.minimumLength} characters required`);
  if (policy.requireUppercase && !/[A-Z]/.test(password))
    failures.push("At least one uppercase letter required");
  if (policy.requireLowercase && !/[a-z]/.test(password))
    failures.push("At least one lowercase letter required");
  if (policy.requireNumber && !/\d/.test(password))
    failures.push("At least one number required");
  if (policy.requireSpecialCharacter && !/[^A-Za-z0-9]/.test(password))
    failures.push("At least one special character required");
  return { valid: failures.length === 0, failures };
}
