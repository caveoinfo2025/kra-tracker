"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type Branch = {
  id: number; name: string; address: string; district: string;
  state: string; pincode: string; gstNo: string; officeType: string;
  crmSource: string;
};

type Customer = Branch & { branches: Branch[]; parentId: number | null };

type Stats = { total: number; ho: number; branches: number; withGst: number };

type DupeGroup = Branch[];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra & Nagar Haveli",
  "Daman & Diu","Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const EMPTY_FORM = {
  name: "", address: "", district: "", state: "", pincode: "", gstNo: "",
  officeType: "HO", parentId: "",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = "text-[#CC2229]" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white border rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Form modal ───────────────────────────────────────────────────────────────

function CustomerForm({
  initial, customers, onClose, onSave,
}: {
  initial: typeof EMPTY_FORM & { id?: number };
  customers: Customer[];
  onClose: () => void;
  onSave: (data: Customer) => void;
}) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!initial.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    const url = isEdit ? `/api/customers/master/${initial.id}` : "/api/customers/master";
    const method = isEdit ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, parentId: form.parentId ? Number(form.parentId) : null }),
      });
      if (!res.ok) { setErr((await res.json()).error ?? "Save failed"); return; }
      onSave(await res.json());
    } catch { setErr("Network error"); }
    finally { setLoading(false); }
  }

  const hoList = customers.filter(c => c.officeType === "HO" && c.id !== initial.id);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">{isEdit ? "Edit" : "Add"} Customer</h3>
          {err && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{err}</div>}
          <form onSubmit={submit} className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Name *</label>
              <input required value={form.name} onChange={e => f("name", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="e.g. Infosys Technologies" />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
              <textarea rows={2} value={form.address} onChange={e => f("address", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="Street address" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">District</label>
                <input value={form.district} onChange={e => f("district", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="e.g. Chennai" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                <select value={form.state} onChange={e => f("state", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pincode</label>
                <input value={form.pincode} onChange={e => f("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="600001" maxLength={6} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">GST Number</label>
                <input value={form.gstNo} onChange={e => f("gstNo", e.target.value.toUpperCase())}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="27AAPFU0939F1ZV" maxLength={15} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Office Type</label>
                <select value={form.officeType} onChange={e => { f("officeType", e.target.value); if (e.target.value === "HO") f("parentId", ""); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                  <option value="HO">Head Office (HO)</option>
                  <option value="Branch">Branch</option>
                </select>
              </div>
            </div>

            {form.officeType === "Branch" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Parent HO *</label>
                <select required value={form.parentId} onChange={e => f("parentId", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                  <option value="">Select head office</option>
                  {hoList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-[#CC2229] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                {loading ? "Saving…" : isEdit ? "Update" : "Add Customer"}
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 border text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Dedup modal ──────────────────────────────────────────────────────────────

function DedupModal({ groups, onClose, onMerge }: {
  groups: DupeGroup[]; onClose: () => void; onMerge: () => void;
}) {
  const [selected, setSelected] = useState<Record<number, number>>({}); // groupIdx → keepId
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(0);

  async function mergeGroup(groupIdx: number, keepId: number, deleteIds: number[]) {
    await fetch("/api/customers/master/deduplicate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, deleteIds }),
    });
    setDone(d => d + 1);
  }

  async function mergeAll() {
    setLoading(true);
    for (let i = 0; i < groups.length; i++) {
      const keepId = selected[i] ?? groups[i][0].id;
      const deleteIds = groups[i].filter(c => c.id !== keepId).map(c => c.id);
      if (deleteIds.length > 0) await mergeGroup(i, keepId, deleteIds);
    }
    setLoading(false);
    onMerge();
  }

  if (groups.length === 0) return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-xl max-w-sm w-full">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-bold mb-2">No duplicates found!</h3>
        <p className="text-sm text-gray-500 mb-6">All customer names look unique.</p>
        <button onClick={onClose} className="w-full bg-[#CC2229] text-white py-2 rounded-lg font-semibold text-sm">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Duplicate Customer Groups</h3>
          <p className="text-sm text-gray-500 mt-1">{groups.length} group{groups.length !== 1 ? "s" : ""} of likely duplicates found. Select which name to keep in each group.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi} className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Group {gi + 1} — {group.length} entries
              </div>
              {group.map(c => {
                const keepId = selected[gi] ?? group[0].id;
                const isKeep = c.id === keepId;
                return (
                  <label key={c.id} className={`flex items-start gap-3 px-4 py-3 border-t cursor-pointer ${isKeep ? "bg-green-50" : "hover:bg-gray-50"}`}>
                    <input type="radio" name={`group-${gi}`} checked={isKeep}
                      onChange={() => setSelected(s => ({ ...s, [gi]: c.id }))}
                      className="mt-0.5 accent-[#CC2229]" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {[c.district, c.state].filter(Boolean).join(", ")}
                        {c.gstNo && <span className="ml-2 font-mono">GST: {c.gstNo}</span>}
                        <span className="ml-2 text-gray-300">src: {c.crmSource || "manual"}</span>
                      </div>
                    </div>
                    {isKeep && <span className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-0.5 rounded-full">Keep</span>}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={mergeAll} disabled={loading}
            className="flex-1 bg-[#CC2229] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
            {loading ? `Merging… (${done}/${groups.length})` : `Merge All Duplicates`}
          </button>
          <button onClick={onClose} className="flex-1 border text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerMasterClient({
  initialCustomers, stats: initialStats, isManager,
}: {
  initialCustomers: Customer[];
  stats: Stats;
  isManager: boolean;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "HO" | "Branch">("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [formCustomer, setFormCustomer] = useState<(typeof EMPTY_FORM & { id?: number }) | null>(null);
  const [dupeGroups, setDupeGroups] = useState<DupeGroup[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // All customers (HO + branches flattened) for filters
  const allFlat = useMemo(() => {
    const rows: Customer[] = [];
    for (const c of customers) {
      rows.push(c);
      for (const b of c.branches) rows.push({ ...b, branches: [] });
    }
    return rows;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) ||
        c.gstNo.toLowerCase().includes(q) ||
        c.branches.some(b => b.name.toLowerCase().includes(q));
      const matchState = !stateFilter || c.state === stateFilter || c.branches.some(b => b.state === stateFilter);
      const matchType  = !typeFilter || c.officeType === typeFilter ||
        (typeFilter === "Branch" && c.branches.length > 0);
      return matchSearch && matchState && matchType;
    });
  }, [customers, search, stateFilter, typeFilter]);

  const toggleExpand = (id: number) =>
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Import from CRM ────────────────────────────────────────────────────────
  const importFromCrm = useCallback(async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/customers/master/import", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Imported ${data.created} new customers (${data.skipped} already existed)`);
        router.refresh();
      } else {
        showToast("❌ Import failed: " + data.error);
      }
    } catch { showToast("❌ Network error"); }
    finally { setImporting(false); }
  }, [router]);

  // ── Find duplicates ────────────────────────────────────────────────────────
  const findDuplicates = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/customers/master/deduplicate");
      if (res.ok) setDupeGroups((await res.json()).groups);
    } catch { showToast("❌ Could not check duplicates"); }
    finally { setChecking(false); }
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteCustomer = useCallback(async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Any branches will become standalone HOs.`)) return;
    const res = await fetch(`/api/customers/master/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCustomers(p => p.filter(c => c.id !== id));
      setStats(s => ({ ...s, total: s.total - 1, ho: s.ho - 1 }));
      showToast("Deleted");
    }
  }, []);

  // ── Form save ──────────────────────────────────────────────────────────────
  const onSave = useCallback((saved: Customer) => {
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      // new entry
      if (saved.officeType === "HO" || !saved.parentId) {
        return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
      }
      // branch — add to parent
      return prev.map(c => c.id === saved.parentId
        ? { ...c, branches: [...c.branches, saved].sort((a, b) => a.name.localeCompare(b.name)) }
        : c
      );
    });
    setFormCustomer(null);
    showToast(saved.id ? "Customer updated" : "Customer added");
  }, []);

  const states = useMemo(() =>
    [...new Set(allFlat.map(c => c.state).filter(Boolean))].sort(), [allFlat]);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={stats.total} />
        <StatCard label="Head Offices"    value={stats.ho}       color="text-blue-700" />
        <StatCard label="Branches"        value={stats.branches} color="text-amber-700" />
        <StatCard label="With GST"        value={stats.withGst}  color="text-green-700" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" placeholder="Search by name, district, state, GST…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All States</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "" | "HO" | "Branch")}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All Types</option>
            <option value="HO">Head Office</option>
            <option value="Branch">With Branches</option>
          </select>
          <span className="text-xs text-gray-400">{filtered.length} records</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isManager && (
            <>
              <button onClick={importFromCrm} disabled={importing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                {importing ? "Importing…" : "⬇ Import from CRM"}
              </button>
              <button onClick={findDuplicates} disabled={checking}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50">
                {checking ? "Checking…" : "🔍 Find Duplicates"}
              </button>
            </>
          )}
          <button onClick={() => setFormCustomer({ ...EMPTY_FORM })}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-[#CC2229] text-white rounded-lg hover:bg-[#A81B21]">
            + Add Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">No customers found.</p>
            {isManager && (
              <button onClick={importFromCrm} className="mt-3 text-sm text-[#CC2229] hover:underline">
                Import from CRM →
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Customer Name", "GST No.", "Address", "District", "State", "Pincode", "Type", "Source", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const isExp = expanded.has(c.id);
                return (
                  <>
                    {/* HO row */}
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.branches.length > 0 && (
                            <button onClick={() => toggleExpand(c.id)}
                              className="text-gray-400 hover:text-gray-700 text-xs font-bold w-5 h-5 flex items-center justify-center rounded bg-gray-100">
                              {isExp ? "▾" : "▸"}
                            </button>
                          )}
                          <span className="font-semibold text-gray-900">{c.name}</span>
                          {c.branches.length > 0 && (
                            <span className="text-xs text-gray-400">+{c.branches.length} branch{c.branches.length !== 1 ? "es" : ""}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.gstNo || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{c.address || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.district || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.state || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{c.pincode || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge label="HO" variant="neutral" />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{c.crmSource || "manual"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setFormCustomer({
                            id: c.id, name: c.name, address: c.address, district: c.district,
                            state: c.state, pincode: c.pincode, gstNo: c.gstNo,
                            officeType: c.officeType, parentId: "",
                          })} className="text-xs text-[#CC2229] hover:underline font-medium">Edit</button>
                          {isManager && (
                            <button onClick={() => deleteCustomer(c.id, c.name)}
                              className="text-xs text-red-400 hover:underline font-medium">Del</button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Branch rows (expanded) */}
                    {isExp && c.branches.map(b => (
                      <tr key={`b-${b.id}`} className="bg-blue-50/30 hover:bg-blue-50/60">
                        <td className="px-4 py-2 pl-12">
                          <span className="text-gray-700 text-sm">↳ {b.name}</span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{b.gstNo || "—"}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs max-w-[180px] truncate">{b.address || "—"}</td>
                        <td className="px-4 py-2 text-gray-500 text-sm">{b.district || "—"}</td>
                        <td className="px-4 py-2 text-gray-500 text-sm">{b.state || "—"}</td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-sm">{b.pincode || "—"}</td>
                        <td className="px-4 py-2">
                          <Badge label="Branch" variant="warning" />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">{b.crmSource || "manual"}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => setFormCustomer({
                              id: b.id, name: b.name, address: b.address, district: b.district,
                              state: b.state, pincode: b.pincode, gstNo: b.gstNo,
                              officeType: "Branch", parentId: String(c.id),
                            })} className="text-xs text-[#CC2229] hover:underline font-medium">Edit</button>
                            {isManager && (
                              <button onClick={() => deleteCustomer(b.id, b.name)}
                                className="text-xs text-red-400 hover:underline font-medium">Del</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit form modal */}
      {formCustomer !== null && (
        <CustomerForm
          initial={formCustomer}
          customers={customers}
          onClose={() => setFormCustomer(null)}
          onSave={onSave}
        />
      )}

      {/* Dedup modal */}
      {dupeGroups !== null && (
        <DedupModal
          groups={dupeGroups}
          onClose={() => setDupeGroups(null)}
          onMerge={() => { setDupeGroups(null); router.refresh(); showToast("✅ Duplicates merged"); }}
        />
      )}
    </div>
  );
}
