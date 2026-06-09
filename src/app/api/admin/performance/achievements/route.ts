import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  listAchievements,
  recordAchievement,
  updateAchievement,
  getTotalWeightedScore,
} from "@/lib/performance-engine";
import { getKRATemplate } from "@/lib/performance-engine";
import { getEmployeeTarget } from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employeeTargetId = req.nextUrl.searchParams.get("employeeTargetId");
  if (!employeeTargetId) return NextResponse.json({ error: "employeeTargetId required" }, { status: 400 });

  const achievements = await listAchievements(Number(employeeTargetId));
  const totalScore = await getTotalWeightedScore(Number(employeeTargetId));
  return NextResponse.json({ achievements, totalScore });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { employeeTargetId, metricId, actualValue, sourceReference } = body;
  if (!employeeTargetId || !metricId || actualValue === undefined) {
    return NextResponse.json({ error: "employeeTargetId, metricId, actualValue required" }, { status: 400 });
  }

  // Fetch template to get expected target and weightage for this metric
  const empTarget = await getEmployeeTarget(Number(employeeTargetId));
  if (!empTarget) return NextResponse.json({ error: "Employee target not found" }, { status: 404 });

  let expectedTarget = 0;
  let weightage = 0;

  if (empTarget.templateId) {
    const template = await getKRATemplate(empTarget.templateId);
    const item = template?.items.find((i: { metricId: number; expectedTarget: number; weightage: number }) => i.metricId === Number(metricId));
    expectedTarget = item?.expectedTarget ?? 0;
    weightage = item?.weightage ?? 0;
  }

  const achievement = await recordAchievement(
    { employeeTargetId: Number(employeeTargetId), metricId: Number(metricId), actualValue: Number(actualValue), sourceReference },
    expectedTarget,
    weightage,
  );
  return NextResponse.json(achievement, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, actualValue, expectedTarget = 0, weightage = 0 } = body;
  if (!id || actualValue === undefined) return NextResponse.json({ error: "id and actualValue required" }, { status: 400 });

  const achievement = await updateAchievement(Number(id), Number(actualValue), Number(expectedTarget), Number(weightage));
  return NextResponse.json(achievement);
}
