/**
 * Security Engine — Public API
 *
 * Provides configurable security policy evaluation without replacing
 * existing NextAuth authentication or invalidating current sessions.
 * All policy checks are non-enforcing until policies are set to ACTIVE.
 *
 * Usage:
 *   import { evaluateSecurityPolicy, logSecurityEvent } from "@/lib/security-engine";
 */

export * from "./password-policy";
export * from "./mfa";
export * from "./session";
export * from "./access-policy";
export * from "./data-protection";
export * from "./security-log";

import { getPasswordPolicy }        from "./password-policy";
import { getMFAPolicy, isMFARequired } from "./mfa";
import { getSessionPolicy, validateSession } from "./session";
import { getAccessPolicy, checkIPAccess, checkBusinessHours } from "./access-policy";

export type SecurityDecision = "ALLOW" | "BLOCK" | "REQUIRE_MFA" | "REQUIRE_APPROVAL";

export interface EvaluateSecurityInput {
  userId:   number;
  action:   string;
  context?: {
    ip?:               string;
    userRole?:         string;
    sessionAgeMinutes?: number;
    idleMinutes?:      number;
    now?:              Date;
  };
}

export interface EvaluateSecurityResult {
  decision: SecurityDecision;
  reasons:  string[];
}

/**
 * Evaluate security policies for a given user action.
 * Returns ALLOW if no active policies block the action.
 * Never throws — returns ALLOW on any error to preserve backward compatibility.
 */
export async function evaluateSecurityPolicy(
  input: EvaluateSecurityInput,
): Promise<EvaluateSecurityResult> {
  const reasons: string[] = [];

  try {
    const ctx = input.context ?? {};
    const now = ctx.now ?? new Date();

    // 1. IP access check
    if (ctx.ip) {
      const accessPolicy = await getAccessPolicy();
      const ipCheck = checkIPAccess(accessPolicy, ctx.ip);
      if (!ipCheck.allowed) {
        reasons.push(ipCheck.reason ?? "IP blocked");
        return { decision: "BLOCK", reasons };
      }
      const hourCheck = checkBusinessHours(accessPolicy, now);
      if (!hourCheck.allowed) {
        reasons.push(hourCheck.reason ?? "Outside business hours");
        return { decision: "BLOCK", reasons };
      }
    }

    // 2. Session validation
    if (ctx.sessionAgeMinutes !== undefined || ctx.idleMinutes !== undefined) {
      const sessionPolicy = await getSessionPolicy();
      const sessionCheck = validateSession(
        sessionPolicy,
        ctx.sessionAgeMinutes ?? 0,
        ctx.idleMinutes ?? 0,
      );
      if (!sessionCheck.valid) {
        reasons.push(sessionCheck.reason ?? "Session invalid");
        return { decision: "BLOCK", reasons };
      }
    }

    // 3. MFA check
    if (ctx.userRole) {
      const mfaPolicy = await getMFAPolicy();
      if (isMFARequired(mfaPolicy, ctx.userRole)) {
        reasons.push("MFA required for this role");
        return { decision: "REQUIRE_MFA", reasons };
      }
    }

    return { decision: "ALLOW", reasons };
  } catch {
    // Fail open — never block existing flows due to a security engine error
    return { decision: "ALLOW", reasons: [] };
  }
}

/**
 * Validate a password string against the active password policy.
 * Returns { valid: true } if no active policy exists (backward compatible).
 */
export async function validatePasswordAgainstPolicy(
  password: string,
): Promise<{ valid: boolean; failures: string[] }> {
  try {
    const { getPasswordPolicy: gpp, validatePasswordPolicy: vpp } = await import("./password-policy");
    const policy = await gpp();
    if (!policy) return { valid: true, failures: [] };
    return vpp(password, policy);
  } catch {
    return { valid: true, failures: [] };
  }
}
