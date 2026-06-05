"use client";

import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import type { SLARule } from "@/lib/crm-engine";

const SLA_MODULES = ["LEAD", "OPPORTUNITY", "TASK", "SUPPORT", "EXPENSE"];
const SLA_EVENTS: Record<string, string[]> = {
  LEAD:        ["first_contact", "follow_up", "qualification", "proposal"],
  OPPORTUNITY: ["proposal_sent", "demo_scheduled", "negotiation", "closure"],
  TASK:        ["created", "assigned", "due"],
  SUPPORT:     ["created", "first_response", "resolution"],
  EXPENSE:     ["submitted", "approved", "reimbursed"],
};

interface Props {
  initialData: SLARule[];
}

export default function SLAManager({ initialData }: Props) {
  const [rules, setRules] = useState<SLARule[]>(initialData);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    module: "LEAD", event: "first_contact", label: "",
    durationHours: 24, warningHours: 4,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/crm/sla");
    if (res.ok) {
      const data = await res.json() as { rules: SLARule[] };
      setRules(data.rules);
    }
  }

  async function handleCreate() {
    if (form.durationHours <= 0) { setError("Duration must be > 0"); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/crm/sla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setShowNew(false);
      setForm({ module: "LEAD", event: "first_contact", label: "", durationHours: 24, warningHours: 4 });
      await reload();
    } else {
      const d = await res.json() as { error: string };
      setError(d.error ?? "Failed");
    }
  }

  async function handleDelete(id: number) {
    await fetch("/api/admin/crm/sla", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    await reload();
  }

  const grouped = rules.reduce<Record<string, SLARule[]>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">SLA Rules</h2>
          <p className="text-xs text-gray-500 mt-0.5">Define response and resolution time targets for CRM activities.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90">
          <Plus size={14} /> New SLA Rule
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Module</label>
              <select value={form.module}
                onChange={e => setForm(f => ({ ...f, module: e.target.value, event: (SLA_EVENTS[e.target.value] ?? [])[0] ?? "" }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5">
                {SLA_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Event</label>
              <select value={form.event} onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5">
                {(SLA_EVENTS[form.module] ?? []).map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Label (optional)</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="e.g. First contact within 24h" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Duration (hours) *</label>
              <input type="number" min={1} value={form.durationHours}
                onChange={e => setForm(f => ({ ...f, durationHours: Number(e.target.value) }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Warning threshold (hours)</label>
              <input type="number" min={0} value={form.warningHours}
                onChange={e => setForm(f => ({ ...f, warningHours: Number(e.target.value) }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
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
          No SLA rules configured.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, moduleRules]) => (
            <div key={module}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{module}</h3>
              <div className="space-y-2">
                {moduleRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <Clock size={15} className="text-[var(--caveo-red)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {rule.label || `${rule.event}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Event: <span className="font-mono">{rule.event}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{rule.durationHours}h</p>
                      {rule.warningHours > 0 && (
                        <p className="text-xs text-amber-600">warn at {rule.warningHours}h</p>
                      )}
                    </div>
                    <button onClick={() => handleDelete(rule.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition ml-2">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
