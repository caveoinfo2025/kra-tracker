"use client";

import { useState, useTransition } from "react";
import { Plus, ChevronDown, ChevronRight, Trash2, Star } from "lucide-react";
import type { PipelineWithStages } from "@/lib/crm-engine";
import type { PipelineStage } from "@/lib/crm-engine";

const STAGE_TYPES = ["OPEN", "WON", "LOST", "STALLED"];

interface Props {
  initialData: PipelineWithStages[];
}

export default function PipelineDesigner({ initialData }: Props) {
  const [pipelines, setPipelines] = useState(initialData);
  const [expanded, setExpanded] = useState<number | null>(initialData[0]?.id ?? null);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newPipeline, setNewPipeline] = useState({ name: "", code: "", description: "", isDefault: false });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function reload() {
    const res = await fetch("/api/admin/crm/pipelines");
    if (res.ok) {
      const data = await res.json() as { pipelines: PipelineWithStages[] };
      setPipelines(data.pipelines);
    }
  }

  function handleCreatePipeline() {
    if (!newPipeline.name || !newPipeline.code) { setError("Name and code required"); return; }
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/admin/crm/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPipeline),
      });
      if (res.ok) {
        setShowNewPipeline(false);
        setNewPipeline({ name: "", code: "", description: "", isDefault: false });
        await reload();
      } else {
        const d = await res.json() as { error: string };
        setError(d.error ?? "Failed to create");
      }
    });
  }

  async function handleSetDefault(id: number) {
    await fetch(`/api/admin/crm/pipelines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await reload();
  }

  async function handleDeleteStage(pipelineId: number, stageId: number) {
    await fetch(`/api/admin/crm/pipelines/${pipelineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteStageId: stageId }),
    });
    await reload();
  }

  async function handleAddStage(pipelineId: number, stage: Omit<PipelineStage, "id" | "pipelineId" | "status" | "createdAt" | "updatedAt" | "entryRuleId" | "exitRuleId">) {
    await fetch(`/api/admin/crm/pipelines/${pipelineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addStage: stage }),
    });
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Sales Pipelines</h2>
        <button
          onClick={() => setShowNewPipeline(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90 transition"
        >
          <Plus size={14} /> New Pipeline
        </button>
      </div>

      {showNewPipeline && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-700">New Pipeline</h3>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Name *</label>
              <input value={newPipeline.name} onChange={e => setNewPipeline(p => ({ ...p, name: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="Sales Pipeline" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Code *</label>
              <input value={newPipeline.code} onChange={e => setNewPipeline(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 font-mono" placeholder="SALES" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Description</label>
            <input value={newPipeline.description} onChange={e => setNewPipeline(p => ({ ...p, description: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="Optional" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={newPipeline.isDefault} onChange={e => setNewPipeline(p => ({ ...p, isDefault: e.target.checked }))} />
            Set as default pipeline
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreatePipeline} disabled={isPending}
              className="px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90 disabled:opacity-50">
              Create
            </button>
            <button onClick={() => setShowNewPipeline(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
          </div>
        </div>
      )}

      {pipelines.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-lg">
          No pipelines configured yet. Create your first one above.
        </div>
      )}

      {pipelines.map((pipeline) => (
        <PipelineCard
          key={pipeline.id}
          pipeline={pipeline}
          expanded={expanded === pipeline.id}
          onToggle={() => setExpanded(expanded === pipeline.id ? null : pipeline.id)}
          onSetDefault={() => handleSetDefault(pipeline.id)}
          onDeleteStage={(stageId) => handleDeleteStage(pipeline.id, stageId)}
          onAddStage={(stage) => handleAddStage(pipeline.id, stage)}
        />
      ))}
    </div>
  );
}

function PipelineCard({
  pipeline, expanded, onToggle, onSetDefault, onDeleteStage, onAddStage,
}: {
  pipeline: PipelineWithStages;
  expanded: boolean;
  onToggle: () => void;
  onSetDefault: () => void;
  onDeleteStage: (id: number) => void;
  onAddStage: (s: { stageName: string; stageCode: string; sequence: number; probability: number; stageType: string; requiresApproval: boolean; mandatoryFieldsJson: string }) => void;
}) {
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStage, setNewStage] = useState({ stageName: "", stageCode: "", probability: 50, stageType: "OPEN", requiresApproval: false });

  function submitStage() {
    if (!newStage.stageName || !newStage.stageCode) return;
    onAddStage({
      ...newStage,
      stageCode: newStage.stageCode.toUpperCase(),
      sequence: (pipeline.stages.length + 1),
      mandatoryFieldsJson: "[]",
    });
    setNewStage({ stageName: "", stageCode: "", probability: 50, stageType: "OPEN", requiresApproval: false });
    setShowAddStage(false);
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div>
            <span className="font-medium text-gray-900">{pipeline.name}</span>
            <span className="ml-2 text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{pipeline.code}</span>
            {pipeline.isDefault && (
              <span className="ml-2 text-xs text-amber-600 font-medium">★ Default</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{pipeline.stages.length} stages</span>
          {!pipeline.isDefault && (
            <button
              onClick={(e) => { e.stopPropagation(); onSetDefault(); }}
              className="p-1 text-gray-400 hover:text-amber-500 transition"
              title="Set as default"
            >
              <Star size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          {/* Stage list */}
          <div className="space-y-2">
            {pipeline.stages.map((stage: PipelineStage, idx: number) => (
              <div key={stage.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded px-3 py-2">
                <span className="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{stage.stageName}</span>
                  <span className="ml-2 text-xs font-mono text-gray-400">{stage.stageCode}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  stage.stageType === "WON" ? "bg-green-100 text-green-700" :
                  stage.stageType === "LOST" ? "bg-red-100 text-red-700" :
                  stage.stageType === "STALLED" ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{stage.stageType}</span>
                <span className="text-xs text-gray-500">{stage.probability}%</span>
                <button
                  onClick={() => onDeleteStage(stage.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add stage */}
          {showAddStage ? (
            <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Stage Name *</label>
                  <input value={newStage.stageName} onChange={e => setNewStage(s => ({ ...s, stageName: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-sm mt-0.5" placeholder="e.g. Negotiation" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Code *</label>
                  <input value={newStage.stageCode} onChange={e => setNewStage(s => ({ ...s, stageCode: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-2 py-1 text-sm mt-0.5 font-mono" placeholder="NEGOTIATION" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Type</label>
                  <select value={newStage.stageType} onChange={e => setNewStage(s => ({ ...s, stageType: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-sm mt-0.5">
                    {STAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Probability %</label>
                  <input type="number" min={0} max={100} value={newStage.probability}
                    onChange={e => setNewStage(s => ({ ...s, probability: Number(e.target.value) }))}
                    className="w-full border rounded px-2 py-1 text-sm mt-0.5" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={newStage.requiresApproval}
                  onChange={e => setNewStage(s => ({ ...s, requiresApproval: e.target.checked }))} />
                Requires approval to enter this stage
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={submitStage} className="px-3 py-1 bg-[var(--caveo-red)] text-white text-xs rounded hover:opacity-90">
                  Add Stage
                </button>
                <button onClick={() => setShowAddStage(false)} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddStage(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
            >
              <Plus size={14} /> Add Stage
            </button>
          )}
        </div>
      )}
    </div>
  );
}
