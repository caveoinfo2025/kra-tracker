import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeKRAProgress } from "@/lib/kra-engine";
import { getSession } from "@/lib/dev-session";

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();

  // Manager can sync any employee; employee can only sync themselves
  const employeeId = session?.user?.isManager
    ? Number(body.employeeId)
    : session?.user?.employeeId;

  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kras = await prisma.kRA.findMany({
    where: { employeeId, status: "active" },
    select: { id: true, title: true, target: true },
  });

  if (!kras.length) return NextResponse.json({ synced: 0 });

  const computed = await computeKRAProgress(employeeId, kras);
  const now = new Date();
  const week = getWeekNumber(now);
  const year = now.getFullYear();

  let synced = 0;
  for (const c of computed) {
    if (c.progress === 0 && c.notes.includes("manually")) continue;

    // Upsert: update existing review for this week/year/kra or create new
    const existing = await prisma.weeklyReview.findFirst({
      where: { kraId: c.kraId, employeeId, week, year },
    });

    if (existing) {
      await prisma.weeklyReview.update({
        where: { id: existing.id },
        data: { progress: c.progress, score: c.score, notes: c.notes },
      });
    } else {
      await prisma.weeklyReview.create({
        data: {
          kraId: c.kraId,
          employeeId,
          week,
          year,
          progress: c.progress,
          score: c.score,
          notes: c.notes,
          blockers: "",
        },
      });
    }
    synced++;
  }

  return NextResponse.json({ synced, week, year });
}

