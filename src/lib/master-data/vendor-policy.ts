/**
 * Master Data — Vendor Policy Service
 *
 * Per-company governance rules for vendor creation and management.
 */

import { logMasterEvent } from "./audit";

export interface VendorPolicy {
  id:                       number;
  companyId:                number | null;
  gstRequired:              boolean;
  panRequired:              boolean;
  bankVerificationRequired: boolean;
  approvalRequired:         boolean;
  status:                   string;
  createdAt:                string;
  updatedAt:                string;
}

export async function getVendorPolicy(companyId?: number): Promise<VendorPolicy | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    if (companyId) {
      const company = await db.vendorPolicy.findFirst({
        where: { companyId, status: "ACTIVE" },
      }) as Record<string, unknown> | null;
      if (company) return _map(company);
    }

    const global = await db.vendorPolicy.findFirst({
      where: { companyId: null, status: "ACTIVE" },
    }) as Record<string, unknown> | null;

    return global ? _map(global) : null;
  } catch {
    return null;
  }
}

export async function listVendorPolicies(): Promise<VendorPolicy[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).vendorPolicy.findMany({
      orderBy: { companyId: "asc" },
    }) as Array<Record<string, unknown>>;
    return rows.map(_map);
  } catch {
    return [];
  }
}

export async function upsertVendorPolicy(data: {
  companyId?:               number;
  gstRequired?:             boolean;
  panRequired?:             boolean;
  bankVerificationRequired?: boolean;
  approvalRequired?:        boolean;
  actorId:                  number;
}): Promise<VendorPolicy | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const existing = await db.vendorPolicy.findFirst({
      where: { companyId: data.companyId ?? null },
    }) as Record<string, unknown> | null;

    const payload = {
      companyId:                data.companyId                ?? null,
      gstRequired:              data.gstRequired              ?? true,
      panRequired:              data.panRequired              ?? false,
      bankVerificationRequired: data.bankVerificationRequired ?? false,
      approvalRequired:         data.approvalRequired         ?? true,
      status:                   "ACTIVE",
    };

    let row: Record<string, unknown>;
    if (existing) {
      row = await db.vendorPolicy.update({
        where: { id: existing.id as number },
        data:  payload,
      }) as Record<string, unknown>;
    } else {
      row = await db.vendorPolicy.create({ data: payload }) as Record<string, unknown>;
    }

    await logMasterEvent(row.id as number, "POLICY", "POLICY_UPDATED", data.actorId, undefined, JSON.stringify(payload));
    return _map(row);
  } catch {
    return null;
  }
}

function _map(r: Record<string, unknown>): VendorPolicy {
  return {
    id:                       r.id                       as number,
    companyId:                r.companyId                as number | null,
    gstRequired:              Boolean(r.gstRequired),
    panRequired:              Boolean(r.panRequired),
    bankVerificationRequired: Boolean(r.bankVerificationRequired),
    approvalRequired:         Boolean(r.approvalRequired),
    status:                   r.status                   as string,
    createdAt:                new Date(r.createdAt as string | number).toISOString(),
    updatedAt:                new Date(r.updatedAt as string | number).toISOString(),
  };
}
