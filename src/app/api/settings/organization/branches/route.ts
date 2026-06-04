import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/access-control";
import { canAccessSettings } from "@/lib/roles";
import { MOCK_BRANCHES } from "@/app/settings/organization/data/organization.types";

async function checkAccess(write = false): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  const userId = session.user.employeeId ?? 0;
  try {
    const allowed = await hasPermission(userId, "Settings", "Organization", write ? "EDIT" : "VIEW");
    if (allowed) return true;
    return canAccessSettings(session.user);
  } catch {
    return canAccessSettings(session.user);
  }
}

export async function GET() {
  if (!await checkAccess(false)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        company: { select: { companyName: true } },
        _count: { select: { employeeProfiles: true } },
      },
    });
    const shaped = branches.map((b) => ({
      id: b.id,
      companyId: b.companyId,
      companyName: b.company.companyName,
      branchName: b.branchName,
      branchCode: b.branchCode,
      address: b.address,
      city: b.city,
      state: b.state,
      country: b.country,
      timezone: b.timezone,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      employeeCount: b._count.employeeProfiles,
    }));
    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json(MOCK_BRANCHES);
  }
}

export async function POST(req: Request) {
  if (!await checkAccess(true)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { companyId, branchName, branchCode, address, city, state, country, timezone } = body;
  if (!companyId || !branchName?.trim()) {
    return NextResponse.json({ error: "Company and branch name are required." }, { status: 400 });
  }

  try {
    const branch = await prisma.branch.create({
      data: {
        companyId: Number(companyId),
        branchName: branchName.trim(),
        branchCode: branchCode?.trim() ?? "",
        address: address?.trim() ?? "",
        city: city?.trim() ?? "",
        state: state?.trim() ?? "",
        country: country?.trim() ?? "India",
        timezone: timezone?.trim() ?? "Asia/Kolkata",
        status: "ACTIVE",
      },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not ready. Run migration first." }, { status: 503 });
  }
}
