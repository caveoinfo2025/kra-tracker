import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getPipeline, updatePipeline, upsertStage, deleteStage, reorderStages } from "@/lib/crm-engine";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pipeline = await getPipeline(Number(id));
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pipeline);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name?: string;
    description?: string;
    isDefault?: boolean;
    status?: string;
    // Stage operations
    addStage?: {
      stageName: string; stageCode: string; sequence: number;
      probability?: number; stageType?: string; requiresApproval?: boolean;
      mandatoryFieldsJson?: string;
    };
    updateStage?: { id: number; stageName?: string; probability?: number; stageType?: string; requiresApproval?: boolean; mandatoryFieldsJson?: string };
    deleteStageId?: number;
    reorderStageIds?: number[];
  };

  const numId = Number(id);

  if (body.addStage) {
    const stage = await upsertStage({ pipelineId: numId, ...body.addStage });
    return NextResponse.json({ stage }, { status: 201 });
  }
  if (body.updateStage) {
    const { id: stageId, ...stageData } = body.updateStage;
    const stage = await upsertStage({ id: stageId, pipelineId: numId, stageName: "", stageCode: "", sequence: 0, ...stageData });
    return NextResponse.json({ stage });
  }
  if (body.deleteStageId) {
    await deleteStage(body.deleteStageId);
    return NextResponse.json({ ok: true });
  }
  if (body.reorderStageIds) {
    await reorderStages(numId, body.reorderStageIds);
    return NextResponse.json({ ok: true });
  }

  const pipeline = await updatePipeline(numId, {
    name: body.name,
    description: body.description,
    isDefault: body.isDefault,
    status: body.status,
  });
  return NextResponse.json({ pipeline });
}
