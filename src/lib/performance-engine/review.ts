import prisma from "@/lib/prisma";
import { logPerformanceAudit } from "./audit";

export type PerformanceReviewInput = {
  employeeTargetId: number;
  reviewerId: number;
  workflowRequestId?: number;
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  comments?: string;
  status?: string;
};

const VALID_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];

export async function listReviews(filters?: { employeeTargetId?: number; reviewerId?: number; status?: string }) {
  try {
    return await prisma.performanceReview.findMany({
      where: filters,
      include: { employeeTarget: { include: { period: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function getReview(id: number) {
  try {
    return await prisma.performanceReview.findUnique({
      where: { id },
      include: { employeeTarget: { include: { period: true, achievements: { include: { metric: true } } } } },
    });
  } catch {
    return null;
  }
}

export async function startPerformanceReview(input: PerformanceReviewInput, performedBy: number) {
  const review = await prisma.performanceReview.create({
    data: { ...input, status: input.status ?? "DRAFT" },
  });

  await logPerformanceAudit({
    entityType: "performance_review",
    entityId: review.id,
    action: "CREATE",
    oldValue: "",
    newValue: JSON.stringify({ status: "DRAFT" }),
    performedBy,
  });

  return review;
}

export async function updateReview(id: number, input: Partial<PerformanceReviewInput>, performedBy: number) {
  if (input.status && !VALID_STATUSES.includes(input.status)) {
    throw new Error(`Invalid review status: ${input.status}`);
  }

  const old = await prisma.performanceReview.findUnique({ where: { id } });
  const updated = await prisma.performanceReview.update({ where: { id }, data: input });

  await logPerformanceAudit({
    entityType: "performance_review",
    entityId: id,
    action: "UPDATE",
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify(updated),
    performedBy,
  });

  return updated;
}
