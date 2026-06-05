"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import type { AccountAssignmentRule } from "@/lib/crm-engine";

const ASSIGN_TYPES = ["EMPLOYEE", "TEAM", "ROUND_ROBIN", "MANAGER"];

interface Props {
  initialData: AccountAssignmentRule[];
}

export default function AssignmentRuleBuilder({ initialData }: Props) {
  const [rules, setRules] = useState(initialData);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: "", priority: 10, assignToType: "EMPLOYEE",
    assignToId: "", assignToName: "",
    conditionField: "city", conditionValue: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/crm/assignment");
    if (res.ok) {
      const data = await res.json() as { rules: AccountAssignmentRule[] };
      setRules(data.rules);
    }
  }

  async function handleCreate() {
    if (!form.name || !form.conditionValue) { setError("Name and condition value required"); return; }
    setError("");
    setLoading(true);
    const conditionJson = JSON.stringify({ [form.conditionField]: form.conditionValue });
    const res = await fetch("/api/admin/crm/assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        priority: form.priority,
        conditionJson,
        assignToType: form.assignToType,
        assignToId: form.assignToId ? Number(form.assignToId) : undefined,
        assignToName: form.assignToName,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", priority: 10, assignToType: "EMPLOYEE", assignToId: "", assignToName: "", conditionField: "city", conditionValue: "" });
      await reload();
    } else {
      const d = await res.json() as { error: string };
      setError(d.error ?? "Failed");
    }
  }

  async function handleDelete(id: number) {
    await fetch("/api/admin/crm/assignment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    await reload();
  }

  function parseCondition(json: string): string {
    try {
      const obj = JSON.parse(json) as Record<string, unknown>;
      return Object.entries(obj).map(([k, v]) => `${k} = "${v}"`).join(", ");
    } catch { return json; }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Assignment Rules</h2>
          <p className="text-xs text-gray-500 mt-0.5">Rules are evaluated in priority order. First match wins.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90">
          <Plus size={14} /> New Rule
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Rule Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="e.g. Chennai Leads" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Priority (lower = higher priority)</label>
              <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Condition Field</label>
              <input value={form.conditionField} onChange={e => setForm(f => ({ ...f, conditionField: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 font-mono" placeholder="city" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Condition Value *</label>
              <input value={form.conditionValue} onChange={e => setForm(f => ({ ...f, conditionValue: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="Chennai" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600">Assign To Type</label>
              <select value={form.assignToType} onChange={e => setForm(f => ({ ...f, assignToType: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5">
                {ASSIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Assignee ID</label>
              <input value={form.assignToId} onChange={e => setForm(f => ({ ...f, assignToId: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="Employee ID" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Assignee Name</label>
              <input value={form.assignToName} onChange={e => setForm(f => ({ ...f, assignToName: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="Display name" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading}
              className="px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90 disabled:opacity-50">
              Create Rule
            </button>
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-lg">
          No assignment rules configured.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
              <span className="text-xs font-mono text-gray-400 w-6">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When <span className="font-mono text-gray-700">{parseCondition(rule.conditionJson)}</span>
                </p>
              </div>
              <ArrowRight size={14} className="text-gray-400 shrink-0" />
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-gray-700">{rule.assignToType}</p>
                <p className="text-xs text-gray-500">{rule.assignToName || `ID: ${rule.assignToId}`}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">P{rule.priority}</span>
              <button onClick={() => handleDelete(rule.id)}
                className="p-1 text-gray-300 hover:text-red-500 transition">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
