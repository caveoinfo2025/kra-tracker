"use client";

import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import type { CRMAutomationRule } from "@/lib/crm-engine";

const CRM_EVENTS = [
  "lead.created",
  "lead.assigned",
  "lead.stage_changed",
  "lead.converted",
  "opportunity.created",
  "opportunity.stage_changed",
  "opportunity.won",
  "opportunity.lost",
  "task.overdue",
  "task.completed",
];

const ACTION_TYPES = ["assign_lead", "update_stage", "create_task", "send_notification"];

interface Props {
  initialData: CRMAutomationRule[];
}

export default function AutomationBuilder({ initialData }: Props) {
  const [rules, setRules] = useState<CRMAutomationRule[]>(initialData);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: "", event: "lead.created", conditionJson: "{}",
    actionType: "assign_lead", actionJson: "{}",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/crm/automation");
    if (res.ok) {
      const data = await res.json() as { rules: CRMAutomationRule[] };
      setRules(data.rules);
    }
  }

  async function handleCreate() {
    if (!form.name) { setError("Name is required"); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/crm/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        event: form.event,
        conditionJson: form.conditionJson,
        actionJson: form.actionJson,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", event: "lead.created", conditionJson: "{}", actionType: "assign_lead", actionJson: "{}" });
      await reload();
    } else {
      const d = await res.json() as { error: string };
      setError(d.error ?? "Failed");
    }
  }

  async function handleToggle(id: number, currentStatus: string) {
    await fetch("/api/admin/crm/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: currentStatus === "active" ? "inactive" : "active" }),
    });
    await reload();
  }

  async function handleDelete(id: number) {
    await fetch("/api/admin/crm/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    await reload();
  }

  function parseAction(json: string): string {
    try {
      const obj = JSON.parse(json) as Record<string, unknown>;
      return obj.type ? String(obj.type) : json;
    } catch { return json; }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">CRM Automation Rules</h2>
          <p className="text-xs text-gray-500 mt-0.5">Trigger actions automatically when CRM events occur.</p>
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
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="e.g. Auto-assign new leads" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Trigger Event</label>
              <select value={form.event} onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5">
                {CRM_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Condition JSON (leave as {} for always)</label>
            <input value={form.conditionJson} onChange={e => setForm(f => ({ ...f, conditionJson: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 font-mono" placeholder="{}" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Action Type</label>
              <select value={form.actionType}
                onChange={e => {
                  const t = e.target.value;
                  setForm(f => ({ ...f, actionType: t, actionJson: JSON.stringify({ type: t }) }));
                }}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5">
                {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Action JSON</label>
              <input value={form.actionJson} onChange={e => setForm(f => ({ ...f, actionJson: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 font-mono" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading}
              className="px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90 disabled:opacity-50">
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-lg">
          No automation rules configured.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${
              rule.status === "active" ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"
            }`}>
              <Zap size={16} className={rule.status === "active" ? "text-amber-500" : "text-gray-400"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  On <span className="font-mono text-gray-700">{rule.event}</span>
                  {" → "}
                  <span className="text-gray-700">{parseAction(rule.actionJson)}</span>
                </p>
              </div>
              <button
                onClick={() => handleToggle(rule.id, rule.status)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${
                  rule.status === "active"
                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                    : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700"
                }`}
              >
                {rule.status === "active" ? "Active" : "Inactive"}
              </button>
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
