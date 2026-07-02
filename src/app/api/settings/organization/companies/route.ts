import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";
import { logAuditEvent } from "@/lib/audit-log";
import { MOCK_COMPANIES } from "@/app/settings/organization/data/organization.types";

async function checkAccess(writeRequired = false): Promise<{ ok: boolean; userId: number | null }> {
  const session = await getSession();
  if (!session?.user) return { ok: false, userId: null };
  const userId = session.user.employeeId ?? 0;
  const action = writeRequired ? "EDIT" : "VIEW";
  try {
    const allowed = await hasPermission(userId, "Settings", "Organization", action);
    if (allowed) return { ok: true, userId };
    // Fallback: legacy settings gate during migration
    if (canAccessSettings(session.user)) return { ok: true, userId };
    return { ok: false, userId };
  } catch {
    // DB tables not ready — fall back to legacy gate
    if (canAccessSettings(session.user)) return { ok: true, userId };
    return { ok: false, userId };
  }
}

export async function GET() {
  const { ok } = await checkAccess(false);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { branches: true, employeeProfiles: true } },
      },
    });
    const shaped = companies.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      companyName: c.companyName,
      legalName: c.legalName,
      companyCode: c.companyCode,
      gstNumber: c.gstNumber,
      panNumber: c.panNumber,
      email: c.email,
      phone: c.phone,
      website: c.website,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      branchCount: c._count.branches,
      employeeCount: c._count.employeeProfiles,
    }));
    return NextResponse.json(shaped);
  } catch {
    // Tables not yet migrated — return mock data
    return NextResponse.json(MOCK_COMPANIES);
  }
}

export async function POST(req: Request) {
  const { ok, userId } = await checkAccess(true);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorId = userId ?? 0;

  const body = await req.json();
  const { companyName, legalName, companyCode, gstNumber, panNumber, email, phone, website } = body;

  if (!companyName?.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  try {
    // Validate unique code
    if (companyCode?.trim()) {
      const existing = await prisma.company.findFirst({ where: { companyCode: companyCode.trim() } });
      if (existing) return NextResponse.json({ error: "Company code already exists." }, { status: 409 });
    }

    // Use the default tenant (seeded as CAVEO)
    const tenant = await prisma.tenant.findFirst({ where: { code: "CAVEO" } });
    const tenantId = tenant?.id ?? 1;

    const company = await prisma.company.create({
      data: {
        tenantId,
        companyName: companyName.trim(),
        legalName: legalName?.trim() ?? "",
        companyCode: companyCode?.trim() ?? "",
        gstNumber: gstNumber?.trim() ?? "",
        panNumber: panNumber?.trim() ?? "",
        email: email?.trim() ?? "",
        phone: phone?.trim() ?? "",
        website: website?.trim() ?? "",
        status: "ACTIVE",
      },
    });

    // Phase W11.3 — Organization Audit (read side: GET /api/settings/organization/audit).
    // Fire-and-forget, same convention as every other audit/capture call in this codebase
    // ("never let it block or fail the save").
    logAuditEvent({
      entityType: "Company",
      entityId: company.id,
      action: "CREATED",
      performedById: actorId,
      changes: { entityName: company.companyName, newValue: `Status: ${company.status}` },
    }).catch(() => {});

    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}
