import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { computeKRAProgress } from "@/lib/kra-engine";

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.isManager) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const action: "approved" | "rejected" = body.action;

  if (action !== "approved" && action !== "rejected") {
    return NextResponse.json({ error: "action must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const existing = await prisma.certification.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.certification.update({
    where: { id: Number(id) },
    data: {
      status: action,
      approvedBy: session.user.employeeId ?? null,
      approvedAt: new Date(),
      remarks: body.remarks ?? existing.remarks,
    },
  });

  // Auto-sync the employee's Sales Operations KRA after approval
  if (action === "approved") {
    const kras = await prisma.kRA.findMany({
      where: { employeeId: existing.employeeId, status: "active" },
      select: { id: true, title: true, target: true },
    });

    const salesOpsKRAs = kras.filter((k) => k.title.toLowerCase().includes("sales operations"));
    if (salesOpsKRAs.length > 0) {
      const computed = await computeKRAProgress(existing.employeeId, salesOpsKRAs);
      const now = new Date();
      const week = getWeekNumber(now);
      const year = now.getFullYear();

      for (const c of computed) {
        const existing_review = await prisma.weeklyReview.findFirst({
          where: { kraId: c.kraId, employeeId: existing.employeeId, week, year },
        });
        if (existing_review) {
          await prisma.weeklyReview.update({
            where: { id: existing_review.id },
            data: { progress: c.progress, score: c.score, notes: c.notes },
          });
        } else {
          await prisma.weeklyReview.create({
            data: {
              kraId: c.kraId,
              employeeId: existing.employeeId,
              week,
              year,
              progress: c.progress,
              score: c.score,
              notes: c.notes,
              blockers: "",
            },
          });
        }
      }
    }
  }

  return NextResponse.json(updated);
}
