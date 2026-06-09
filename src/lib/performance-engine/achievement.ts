import prisma from "@/lib/prisma";

export type AchievementInput = {
  employeeTargetId: number;
  metricId: number;
  actualValue: number;
  sourceReference?: string;
};

/** Calculate achievement percentage based on expected target */
export function calculateAchievement(actualValue: number, expectedTarget: number): number {
  if (expectedTarget === 0) return 0;
  return Math.min(200, (actualValue / expectedTarget) * 100); // cap at 200%
}

/** Calculate weighted score from achievement % and weightage */
export function calculateWeightedScore(achievementPct: number, weightage: number): number {
  return (achievementPct / 100) * weightage;
}

export async function recordAchievement(input: AchievementInput, expectedTarget: number, weightage: number) {
  const achievementPct = calculateAchievement(input.actualValue, expectedTarget);
  const weightedScore = calculateWeightedScore(achievementPct, weightage);

  return await prisma.kRAAchievement.create({
    data: {
      ...input,
      achievementPct,
      weightedScore,
    },
  });
}

export async function updateAchievement(
  id: number,
  actualValue: number,
  expectedTarget: number,
  weightage: number,
) {
  const achievementPct = calculateAchievement(actualValue, expectedTarget);
  const weightedScore = calculateWeightedScore(achievementPct, weightage);

  return await prisma.kRAAchievement.update({
    where: { id },
    data: { actualValue, achievementPct, weightedScore, calculatedAt: new Date() },
  });
}

export async function listAchievements(employeeTargetId: number) {
  try {
    return await prisma.kRAAchievement.findMany({
      where: { employeeTargetId },
      include: { metric: true },
      orderBy: { calculatedAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function getTotalWeightedScore(employeeTargetId: number): Promise<number> {
  try {
    const achievements = await prisma.kRAAchievement.findMany({
      where: { employeeTargetId, status: "active" },
      select: { weightedScore: true },
    });
    return achievements.reduce((sum: number, a) => sum + a.weightedScore, 0);
  } catch {
    return 0;
  }
}
