"use client";

import { useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import type { TerritoryWithRules } from "@/lib/crm-engine";

interface Props {
  initialData: TerritoryWithRules[];
}

export default function TerritoryManager({ initialData }: Props) {
  const [territories, setTerritories] = useState(initialData);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/crm/territories");
    if (res.ok) {
      const data = await res.json() as { territories: TerritoryWithRules[] };
      setTerritories(data.territories);
    }
  }

  async function handleCreate() {
    if (!form.name) { setError("Name is required"); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/crm/territories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", description: "" });
      await reload();
    } else {
      const d = await res.json() as { error: string };
      setError(d.error ?? "Failed");
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/crm/territories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" }),
    });
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Sales Territories</h2>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--caveo-red)] text-white text-sm rounded hover:opacity-90">
          <Plus size={14} /> New Territory
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div>
            <label className="text-xs text-gray-600">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="e.g. South India" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" placeholder="Optional" />
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

      {territories.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-lg">
          No territories defined yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {territories.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[var(--caveo-red)] mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(t.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {t.rules.length === 0 ? "No rules configured" : `${t.rules.length} matching rule${t.rules.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
