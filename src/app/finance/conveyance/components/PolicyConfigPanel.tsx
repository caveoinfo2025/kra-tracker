"use client";

import { useState } from "react";
import { Edit2, Save, X, Plus, ShieldCheck } from "lucide-react";
import { PolicyRule, VEHICLE_TYPES, VehicleType } from "../data";

interface Props {
  rules: PolicyRule[];
  onSave: (rules: PolicyRule[]) => void;
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]";
const labelCls = "block text-xs font-medium text-gray-600 mb-1";
const GRADES   = ["Engineer", "Manager", "Executive", "Senior Engineer", "Senior Manager"];
const DOC_RULES: PolicyRule["documentRule"][] = ["mandatory", "optional", "none"];

export default function PolicyConfigPanel({ rules: initialRules, onSave }: Props) {
  const [rules,    setRules]   = useState<PolicyRule[]>(initialRules);
  const [editing,  setEditing] = useState<number | null>(null);
  const [draft,    setDraft]   = useState<PolicyRule | null>(null);
  const [toast,    setToast]   = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2000); }

  function startEdit(r: PolicyRule) {
    setEditing(r.id);
    setDraft({ ...r });
  }

  function cancelEdit() { setEditing(null); setDraft(null); }

  function saveEdit() {
    if (!draft) return;
    setRules((rs) => rs.map((r) => r.id === draft.id ? draft : r));
    onSave(rules.map((r) => r.id === draft.id ? draft : r));
    flash("Policy rule updated");
    cancelEdit();
  }

  function addRule() {
    const id = Math.max(0, ...rules.map((r) => r.id)) + 1;
    const newRule: PolicyRule = { id, grade: "Engineer", vehicle: "Bike", ratePerKm: 5, dailyLimitKm: 80, monthlyLimitKm: 1000, approvalRequired: false, documentRule: "optional" };
    setRules((rs) => [...rs, newRule]);
    startEdit(newRule);
  }

  function setField<K extends keyof PolicyRule>(k: K, v: PolicyRule[K]) {
    setDraft((d) => d ? { ...d, [k]: v } : d);
  }

  // Group by grade
  const grades = [...new Set(rules.map((r) => r.grade))];

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} style={{ color: "var(--fg-3)" }} />
          <div className="ch-title">Conveyance Policy</div>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>HR-configured rate per KM per grade</span>
        </div>
        <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={addRule}>
          <Plus size={13} /> Add Rule
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Vehicle</th>
              <th className="num">Rate / KM</th>
              <th className="num">Daily KM Limit</th>
              <th className="num">Monthly KM Limit</th>
              <th>Approval Req.</th>
              <th>Document Rule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const isEditing = editing === r.id;
              const d = isEditing ? draft! : r;
              return (
                <tr key={r.id}>
                  <td>
                    {isEditing
                      ? <select className="w-40 border rounded px-2 py-1 text-sm" value={d.grade} onChange={(e) => setField("grade", e.target.value)}>
                          {GRADES.map((g) => <option key={g}>{g}</option>)}
                        </select>
                      : <span style={{ fontWeight: 600 }}>{r.grade}</span>
                    }
                  </td>
                  <td>
                    {isEditing
                      ? <select className="w-40 border rounded px-2 py-1 text-sm" value={d.vehicle} onChange={(e) => setField("vehicle", e.target.value as VehicleType)}>
                          {VEHICLE_TYPES.map((v) => <option key={v}>{v}</option>)}
                        </select>
                      : r.vehicle
                    }
                  </td>
                  <td className="num">
                    {isEditing
                      ? <input type="number" className="w-20 border rounded px-2 py-1 text-sm text-right" value={d.ratePerKm} min={0} onChange={(e) => setField("ratePerKm", Number(e.target.value))} />
                      : <span style={{ fontWeight: 700 }}>₹{r.ratePerKm}</span>
                    }
                  </td>
                  <td className="num">
                    {isEditing
                      ? <input type="number" className="w-20 border rounded px-2 py-1 text-sm text-right" value={d.dailyLimitKm} min={0} onChange={(e) => setField("dailyLimitKm", Number(e.target.value))} />
                      : r.dailyLimitKm === 0 ? "—" : `${r.dailyLimitKm} KM`
                    }
                  </td>
                  <td className="num">
                    {isEditing
                      ? <input type="number" className="w-24 border rounded px-2 py-1 text-sm text-right" value={d.monthlyLimitKm} min={0} onChange={(e) => setField("monthlyLimitKm", Number(e.target.value))} />
                      : r.monthlyLimitKm === 0 ? "—" : `${r.monthlyLimitKm} KM`
                    }
                  </td>
                  <td>
                    {isEditing
                      ? <select className="w-20 border rounded px-2 py-1 text-sm" value={d.approvalRequired ? "yes" : "no"} onChange={(e) => setField("approvalRequired", e.target.value === "yes")}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      : <span className={`badge ${r.approvalRequired ? "badge-warning" : "badge-neutral"}`}>{r.approvalRequired ? "Yes" : "No"}</span>
                    }
                  </td>
                  <td>
                    {isEditing
                      ? <select className="w-28 border rounded px-2 py-1 text-sm capitalize" value={d.documentRule} onChange={(e) => setField("documentRule", e.target.value as PolicyRule["documentRule"])}>
                          {DOC_RULES.map((dr) => <option key={dr} value={dr} className="capitalize">{dr}</option>)}
                        </select>
                      : <span className={`badge ${r.documentRule === "mandatory" ? "badge-accent" : r.documentRule === "optional" ? "badge-neutral" : "badge-neutral"}`} style={{ textTransform: "capitalize" }}>{r.documentRule}</span>
                    }
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          className="btn-cav btn-cav-sm"
                          style={{ background: "var(--success)", color: "#fff", border: "none", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}
                          onClick={saveEdit}
                        ><Save size={11} /> Save</button>
                        <button
                          className="btn-cav btn-cav-sm"
                          style={{ fontSize: 11, padding: "3px 9px", borderRadius: 5 }}
                          onClick={cancelEdit}
                        ><X size={11} /></button>
                      </div>
                    ) : (
                      <button
                        className="btn-cav btn-cav-secondary btn-cav-sm"
                        onClick={() => startEdit(r)}
                      ><Edit2 size={12} /> Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-body" style={{ paddingTop: 12, borderTop: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--fg-4)" }}>
        <ShieldCheck size={12} style={{ display: "inline", marginRight: 4 }} />
        Policy rates are applied automatically when employees log trips. Limits are advisory — violations are flagged on submission.
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--cyber-black)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 999, boxShadow: "var(--shadow-lg)", zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
