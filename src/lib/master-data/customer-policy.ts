/**
 * Master Data — Customer Policy Service
 *
 * Per-company governance rules for customer creation and management.
 */

import { logMasterEvent } from "./audit";

export interface CustomerPolicy {
  id:                     number;
  companyId:              number | null;
  customerType:           string;
  gstRequired:            boolean;
  panRequired:            boolean;
  duplicateThreshold:     number;
  creditApprovalRequired: boolean;
  status:                 string;
  createdAt:              string;
  updatedAt:              string;
}

export async function getCustomerPolicy(companyId?: number): Promise<CustomerPolicy | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    // Prefer company-specific policy; fall back to global (companyId IS NULL)
    if (companyId) {
      const company = await db.customerPolicy.findFirst({
        where: { companyId, status: "ACTIVE" },
      }) as Record<string, unknown> | null;
      if (company) return _map(company);
    }

    const global = await db.customerPolicy.findFirst({
      where: { companyId: null, status: "ACTIVE" },
    }) as Record<string, unknown> | null;

    return global ? _map(global) : null;
  } catch {
    return null;
  }
}

export async function listCustomerPolicies(): Promise<CustomerPolicy[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).customerPolicy.findMany({
      orderBy: [{ companyId: "asc" }, { customerType: "asc" }],
    }) as Array<Record<string, unknown>>;
    return rows.map(_map);
  } catch {
    return [];
  }
}

export async function upsertCustomerPolicy(data: {
  companyId?:              number;
  customerType?:           string;
  gstRequired?:            boolean;
  panRequired?:            boolean;
  duplicateThreshold?:     number;
  creditApprovalRequired?: boolean;
  actorId:                 number;
}): Promise<CustomerPolicy | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const existing = await db.customerPolicy.findFirst({
      where: {
        companyId:    data.companyId    ?? null,
        customerType: data.customerType ?? "ALL",
      },
    }) as Record<string, unknown> | null;

    const payload = {
      companyId:              data.companyId              ?? null,
      customerType:           data.customerType           ?? "ALL",
      gstRequired:            data.gstRequired            ?? true,
      panRequired:            data.panRequired            ?? false,
      duplicateThreshold:     data.duplicateThreshold     ?? 80,
      creditApprovalRequired: data.creditApprovalRequired ?? false,
      status:                 "ACTIVE",
    };

    let row: Record<string, unknown>;
    if (existing) {
      row = await db.customerPolicy.update({
        where: { id: existing.id as number },
        data:  payload,
      }) as Record<string, unknown>;
    } else {
      row = await db.customerPolicy.create({ data: payload }) as Record<string, unknown>;
    }

    await logMasterEvent(row.id as number, "POLICY", "POLICY_UPDATED", data.actorId, undefined, JSON.stringify(payload));
    return _map(row);
  } catch {
    return null;
  }
}

function _map(r: Record<string, unknown>): CustomerPolicy {
  return {
    id:                     r.id                     as number,
    companyId:              r.companyId              as number | null,
    customerType:           r.customerType           as string,
    gstRequired:            Boolean(r.gstRequired),
    panRequired:            Boolean(r.panRequired),
    duplicateThreshold:     r.duplicateThreshold     as number,
    creditApprovalRequired: Boolean(r.creditApprovalRequired),
    status:                 r.status                 as string,
    createdAt:              new Date(r.createdAt as string | number).toISOString(),
    updatedAt:              new Date(r.updatedAt as string | number).toISOString(),
  };
}
