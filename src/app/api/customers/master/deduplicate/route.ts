/**
 * GET  /api/customers/master/deduplicate  — return groups of likely duplicates
 * POST /api/customers/master/deduplicate  — merge: keep one, delete the rest
 *
 * Duplicate detection strategy (without fuzzy-match library):
 *   1. Exact match after normalise (trim + lower + collapse whitespace)
 *   2. Strip common legal suffixes (PVT, LTD, PRIVATE, LIMITED, etc.) then
 *      exact-match the "core" name — catches "ABC PVT LTD" vs "ABC PRIVATE LIMITED"
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

const LEGAL_SUFFIXES = /\b(private|pvt|limited|ltd|llp|inc|corp|corporation|co|and|&)\b\.?/gi;

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function coreKey(s: string) {
  return normalise(s).replace(LEGAL_SUFFIXES, "").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, district: true, state: true, gstNo: true, officeType: true, crmSource: true },
    orderBy: { name: "asc" },
  });

  // Group by core key
  const groups = new Map<string, typeof all>();
  for (const c of all) {
    const key = coreKey(c.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Keep only groups with >1 member (these are potential dupes)
  const duplicates = [...groups.values()]
    .filter(g => g.length > 1)
    .sort((a, b) => b.length - a.length);

  return NextResponse.json({ groups: duplicates, total: duplicates.reduce((s, g) => s + g.length, 0) });
}

export async function POST(req: Request) {
  const session = await getSession();
  const deny = await requirePermission(session, "Masters", "CustomerMaster", "DELETE");
  if (deny) return deny;

  const { keepId, deleteIds } = await req.json() as { keepId: number; deleteIds: number[] };
  if (!keepId || !deleteIds?.length) {
    return NextResponse.json({ error: "keepId and deleteIds required" }, { status: 400 });
  }

  // Only merge currently-active duplicates — an already soft-deleted id has
  // nothing to re-parent or merge again.
  const duplicates = await prisma.customer.findMany({
    where: { id: { in: deleteIds }, deletedAt: null },
  });
  if (duplicates.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }
  const activeIds = duplicates.map((c) => c.id);
  const empId = session!.user.employeeId!;
  const now = new Date();
  const deleteReason = `Merged into customer ${keepId}`;

  // Re-parent any branches of the merged-away customers to the kept customer
  await prisma.customer.updateMany({
    where: { parentId: { in: activeIds } },
    data:  { parentId: keepId },
  });

  // No unique constraint on Customer (name/gstNo are plain Strings, not @unique
  // in prisma/schema.prisma), so soft-deleting the merged-away rows alongside
  // the still-active kept customer cannot collide — safe to soft-delete here.
  await prisma.customer.updateMany({
    where: { id: { in: activeIds } },
    data:  { deletedAt: now, deletedById: empId, deleteReason },
  });

  await prisma.$transaction(
    duplicates.map((c) =>
      prisma.auditLog.create({
        data: {
          entityType:    "customer",
          entityId:      c.id,
          action:        "SOFT_DELETE",
          performedById: empId,
          notes:         deleteReason,
          changes: JSON.stringify({
            name:       c.name,
            address:    c.address,
            district:   c.district,
            state:      c.state,
            gstNo:      c.gstNo,
            officeType: c.officeType,
            parentId:   c.parentId,
            mergedIntoId: keepId,
          }),
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true, deleted: activeIds.length });
}
