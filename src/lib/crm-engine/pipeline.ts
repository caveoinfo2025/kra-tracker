import prisma from "@/lib/prisma";
import type { PipelineDefinitionModel as PipelineDefinition } from "@/generated/prisma/models/PipelineDefinition";
import type { PipelineStageModel as PipelineStage } from "@/generated/prisma/models/PipelineStage";

export type { PipelineDefinition, PipelineStage };
export type PipelineWithStages = PipelineDefinition & { stages: PipelineStage[] };

export async function listPipelines(companyId?: number): Promise<PipelineWithStages[]> {
  try {
    return await prisma.pipelineDefinition.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      include: { stages: { where: { status: "active" }, orderBy: { sequence: "asc" } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getPipeline(id: number): Promise<PipelineWithStages | null> {
  try {
    return await prisma.pipelineDefinition.findUnique({
      where: { id },
      include: { stages: { orderBy: { sequence: "asc" } } },
    });
  } catch {
    return null;
  }
}

export async function getDefaultPipeline(): Promise<PipelineWithStages | null> {
  try {
    return await prisma.pipelineDefinition.findFirst({
      where: { isDefault: true, status: "active" },
      include: { stages: { where: { status: "active" }, orderBy: { sequence: "asc" } } },
    });
  } catch {
    return null;
  }
}

export async function createPipeline(data: {
  name: string;
  code: string;
  description?: string;
  isDefault?: boolean;
  companyId?: number;
}): Promise<PipelineDefinition> {
  if (data.isDefault) {
    await prisma.pipelineDefinition.updateMany({ data: { isDefault: false } });
  }
  return prisma.pipelineDefinition.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description ?? "",
      isDefault: data.isDefault ?? false,
      companyId: data.companyId ?? null,
    },
  });
}

export async function updatePipeline(
  id: number,
  data: Partial<{ name: string; description: string; isDefault: boolean; status: string }>
): Promise<PipelineDefinition> {
  if (data.isDefault) {
    await prisma.pipelineDefinition.updateMany({
      where: { id: { not: id } },
      data: { isDefault: false },
    });
  }
  return prisma.pipelineDefinition.update({ where: { id }, data });
}

export async function upsertStage(data: {
  id?: number;
  pipelineId: number;
  stageName: string;
  stageCode: string;
  sequence: number;
  probability?: number;
  stageType?: string;
  requiresApproval?: boolean;
  mandatoryFieldsJson?: string;
  entryRuleId?: number;
  exitRuleId?: number;
}): Promise<PipelineStage> {
  const payload = {
    pipelineId: data.pipelineId,
    stageName: data.stageName,
    stageCode: data.stageCode.toUpperCase(),
    sequence: data.sequence,
    probability: data.probability ?? 50,
    stageType: data.stageType ?? "OPEN",
    requiresApproval: data.requiresApproval ?? false,
    mandatoryFieldsJson: data.mandatoryFieldsJson ?? "[]",
    entryRuleId: data.entryRuleId ?? null,
    exitRuleId: data.exitRuleId ?? null,
  };
  if (data.id) {
    return prisma.pipelineStage.update({ where: { id: data.id }, data: payload });
  }
  return prisma.pipelineStage.create({ data: payload });
}

export async function deleteStage(id: number): Promise<void> {
  await prisma.pipelineStage.update({ where: { id }, data: { status: "inactive" } });
}

export async function reorderStages(
  pipelineId: number,
  orderedIds: number[]
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.pipelineStage.update({ where: { id }, data: { sequence: idx + 1 } })
    )
  );
}
