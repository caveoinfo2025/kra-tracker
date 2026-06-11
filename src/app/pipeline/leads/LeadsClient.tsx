"use client";
import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import CustomerNameCombobox from "@/components/CustomerNameCombobox";
import {
  LeadSerialized,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_SOURCES,
} from "@/types/pipeline";
import { LeadStageBadge } from "@/components/pipeline/StageBadge";
import { LeadCard } from "@/components/pipeline/LeadCard";
import { KanbanBoard, KanbanColumn } from "@/components/pipeline/KanbanBoard";
import { CrmSelect } from "@/components/pipeline/CrmSelect";
import { useMasterValues } from "@/hooks/useMasterValues";

// ── New-lead form modal ───────────────────────────────────────────────────────

function LeadFormModal({
  employees,
  currentEmployeeId,
  isManager,
  onClose,
  onCreated,
  sources,
}: {
  employees: { id: number; name: string }[];
  currentEmployeeId?: number;
  isManager: boolean;
  onClose: () => void;
  onCreated: (l: LeadSerialized) => void;
  sources: string[];
}) {
  const [form, setForm] = useState({
    title: "", companyName: "", contactPerson: "", email: "", phone: "",
    source: "Direct",
    categoryId: "", categoryName: "",
    oemId: "", oemName: "",
    productId: "", productName: "",
    customerId: "", customerName: "",
    expectedValue: "0", remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/pipeline/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedValue: Number(form.expectedValue) }),
      });
      if (!res.ok) { setError("Failed to create lead."); return; }
      const lead = await res.json();
      onCreated(lead);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4 p-6">
        <h3 className="text-lg font-bold mb-4">New Lead</h3>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3 border border-red-200">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lead Title *</label>
              <input required value={form.title} onChange={(e) => f("title", e.target.value)}
                data-testid="lead-title-input"
                placeholder="e.g. NGFW Replacement Project"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
              <CustomerNameCombobox
                value={form.companyName}
                onChange={(v) => f("companyName", v)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person *</label>
              <input required value={form.contactPerson} onChange={(e) => f("contactPerson", e.target.value)}
                data-testid="lead-contact-input"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => f("email", e.target.value)}
                data-testid="lead-email-input"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => f("phone", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
              <select value={form.source} onChange={(e) => f("source", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {sources.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <CrmSelect type="categories" value={form.categoryId} name={form.categoryName}
                onChange={(id, name) => setForm((p) => ({ ...p, categoryId: id, categoryName: name }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">OEM</label>
              <CrmSelect type="oems" value={form.oemId} name={form.oemName}
                onChange={(id, name) => setForm((p) => ({ ...p, oemId: id, oemName: name }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
              <CrmSelect type="products" value={form.productId} name={form.productName} oemId={form.oemId}
                onChange={(id, name) => setForm((p) => ({ ...p, productId: id, productName: name }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer (existing)</label>
              <CrmSelect type="customers" value={form.customerId} name={form.customerName}
                onChange={(id, name) => setForm((p) => ({ ...p, customerId: id, customerName: name }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Value (₹L)</label>
              <input type="number" step="0.1" value={form.expectedValue} onChange={(e) => f("expectedValue", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => f("remarks", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              data-testid="lead-create-button"
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {loading ? "Creating…" : "Create Lead"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Legacy activity types (kept only for prop type — not rendered) ────────────

type LegacyActivity = {
  id: number; date: string; employeeId: number; employee: { name: string };
  territory: string; leadSource: string; customerName: string; contactPerson: string;
  activityType: string; activityCount: number; leadStatus: string;
  qualifiedFlag: boolean; remarks: string;
};

// ── Unified lead type ─────────────────────────────────────────────────────────

type MergedLead = {
  uid: string;
  stage: string;
  companyName: string;
  contactPerson: string;
  ownerName: string;
  ownerId?: number;
  crmId?: number;
  leadTitle?: string;
  expectedValue?: number;
  source?: string;
  updatedAt?: string;
  createdAt?: string;
  opportunityId?: number; // set when lead has reached PROPOSAL_SENT
};

// ── Bulk import ───────────────────────────────────────────────────────────────

const LEAD_IMPORT_FIELDS: Record<string, { label: string; required?: boolean; aliases: string[] }> = {
  title:          { label: "Lead Title *",        required: true,  aliases: ["lead title","title","subject","lead name","opportunity","deal","project"] },
  companyName:    { label: "Company *",           required: true,  aliases: ["company","company name","account","client","customer","organization","firm"] },
  contactPerson:  { label: "Contact Person *",    required: true,  aliases: ["contact person","contact","contact name","name","person","full name"] },
  email:          { label: "Email",                                aliases: ["email","email address","e-mail","mail"] },
  phone:          { label: "Phone",                                aliases: ["phone","phone number","mobile","contact number","tel","telephone","mobile number"] },
  source:         { label: "Source",                               aliases: ["source","lead source","origin","channel"] },
  expectedValue:  { label: "Expected Value (₹L)",                 aliases: ["expected value","value","deal value","opportunity value","expected value (₹l)","value (₹l)","amount","est. value"] },
  remarks:        { label: "Remarks",                              aliases: ["remarks","notes","comment","comments","description"] },
  assignedTo:     { label: "Assigned To",                         aliases: ["assigned to","salesperson","owner","employee","sales rep","representative"] },
};

function autoMapLeads(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, def] of Object.entries(LEAD_IMPORT_FIELDS)) {
    const match = headers.find((h) => def.aliases.some((a) => h.toLowerCase().trim() === a));
    if (match) mapping[match] = field;
  }
  return mapping;
}

function BulkImportModal({
  employees, isManager, currentEmployeeId, onClose, onImported,
}: {
  employees: { id: number; name: string }[];
  isManager: boolean;
  currentEmployeeId?: number;
  onClose: () => void;
  onImported: (inserted: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers,  setHeaders]  = useState<string[]>([]);
  const [rows,     setRows]     = useState<Record<string, unknown>[]>([]);
  const [mapping,  setMapping]  = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [defaultEmp, setDefaultEmp] = useState("");
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<{ inserted: number; updated: number; skipped: number; errors: { row: number; reason: string; customer: string; ref: string }[] } | null>(null);
  const [err, setErr]               = useState("");

  function handleFile(file: File) {
    setFileName(file.name); setResult(null); setErr("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target!.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (!data.length) { setErr("File is empty."); return; }
        const hdrs = Object.keys(data[0]);
        setHeaders(hdrs);
        setRows(data);
        setMapping(autoMapLeads(hdrs));
      } catch { setErr("Could not parse file. Use CSV or XLSX."); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setImporting(true); setErr("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "leads", mapping, rows, defaultEmployeeName: defaultEmp }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Import failed."); return; }
      setResult(data);
      if (data.inserted > 0) onImported(data.inserted);
    } catch { setErr("Network error."); }
    finally { setImporting(false); }
  }

  const requiredMapped = ["title","companyName","contactPerson"].every(
    (f) => Object.values(mapping).includes(f)
  );

  // Sample CSV download
  function downloadTemplate() {
    const ws  = XLSX.utils.aoa_to_sheet([
      ["Lead Title","Company Name","Contact Person","Email","Phone","Source","Expected Value (₹L)","Remarks","Assigned To"],
      ["NGFW Replacement","Acme Corp","John Smith","john@acme.com","9876543210","Referral","5","Demo scheduled","Vijesh"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_import_template.xlsx");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Bulk Import Leads</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {!rows.length ? (
          /* Step 1: file upload */
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#CC2229] transition"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <p className="text-4xl mb-2">📂</p>
              <p className="font-medium text-gray-700">Drop a CSV or XLSX file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Need a template?</p>
              <button onClick={downloadTemplate}
                className="text-xs text-[#CC2229] hover:underline font-medium">
                ⬇ Download sample XLSX
              </button>
            </div>
            {err && <p className="text-red-600 text-sm">{err}</p>}
          </div>
        ) : result ? (
          /* Step 3: results */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Imported",  value: result.inserted, color: "text-green-700" },
                { label: "Updated",   value: result.updated,  color: "text-blue-700" },
                { label: "Skipped",   value: result.skipped,  color: "text-amber-700" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-4 border">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-amber-700 font-medium">
                  {result.errors.length} row(s) had issues — click to expand
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg divide-y text-xs">
                  {result.errors.map((e) => (
                    <div key={e.row} className="px-3 py-2">
                      <span className="font-semibold text-gray-700">Row {e.row}</span>
                      {e.customer !== "—" && <span className="text-gray-500"> · {e.customer}</span>}
                      <span className="text-red-600 block">{e.reason}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <button onClick={onClose}
              className="w-full bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21]">
              Done
            </button>
          </div>
        ) : (
          /* Step 2: column mapping + preview */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-600 font-medium">{fileName}</p>
              <p className="text-gray-400">{rows.length} rows detected</p>
            </div>

            {/* Column mapping */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Map Columns</p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600 truncate flex-1 font-medium">{h}</span>
                    <select
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping((p) => { const n = { ...p }; delete n[h]; if (e.target.value) n[h] = e.target.value; return n; })}
                      className="text-xs border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#CC2229] bg-white"
                    >
                      <option value="">— ignore —</option>
                      {Object.entries(LEAD_IMPORT_FIELDS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!requiredMapped && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ Map <strong>Lead Title</strong>, <strong>Company</strong>, and <strong>Contact Person</strong> to continue.
                </p>
              )}
            </div>

            {/* Default assignee for managers */}
            {isManager && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Default Assigned To <span className="text-gray-400">(used when row has no "Assigned To" value)</span>
                </label>
                <select value={defaultEmp} onChange={(e) => setDefaultEmp(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                  <option value="">— none —</option>
                  {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
            )}

            {/* Preview */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview (first 3 rows)</p>
              <div className="overflow-auto rounded-lg border text-xs">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.entries(mapping).map(([h, f]) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">
                          {LEAD_IMPORT_FIELDS[f]?.label ?? f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.entries(mapping).map(([h]) => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate">
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {err && <p className="text-red-600 text-sm">{err}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={!requiredMapped || importing}
                className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${rows.length} Leads`}
              </button>
              <button onClick={() => { setRows([]); setHeaders([]); setMapping({}); setFileName(""); setErr(""); }}
                className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadsClient({
  initialLeads,
  employees,
  isManager,
  currentEmployeeId,
  initialView,
  initialActivities,
  initialSearch = "",
}: {
  initialLeads: LeadSerialized[];
  employees: { id: number; name: string }[];
  isManager: boolean;
  currentEmployeeId?: number;
  initialView: "table" | "kanban";
  initialActivities: LegacyActivity[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const leadSources = useMasterValues("LEAD_SOURCE_LIST", LEAD_SOURCES);

  const [leads,           setLeads]           = useState(initialLeads);
  const [view,            setView]            = useState<"table" | "kanban">(initialView);
  const [showLeadForm,    setShowLeadForm]    = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters
  const [search,  setSearch]  = useState(initialSearch);
  const [stageF,  setStageF]  = useState("");
  const [sourceF, setSourceF] = useState("");
  const [empF,    setEmpF]    = useState("");

  function handleLeadCreated(l: LeadSerialized) {
    setLeads((p) => [l, ...p]);
    router.refresh();
  }

  // ── Merged dataset (filtered) ──────────────────────────────────────────────

  const merged = useMemo<MergedLead[]>(() => {
    const crmItems: MergedLead[] = leads
      .filter((l) => {
        if (stageF  && l.stage  !== stageF)  return false;
        if (sourceF && l.source !== sourceF) return false;
        if (empF    && String(l.assignedToId) !== empF) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!l.title.toLowerCase().includes(q) &&
              !l.companyName.toLowerCase().includes(q) &&
              !l.contactPerson.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map((l) => ({
        uid:           `crm-${l.id}`,
        stage:         l.stage,
        companyName:   l.companyName,
        contactPerson: l.contactPerson,
        ownerName:     l.assignedTo.name,
        ownerId:       l.assignedToId,
        crmId:         l.id,
        leadTitle:     l.title,
        expectedValue: l.expectedValue,
        source:        l.source,
        updatedAt:     l.updatedAt,
        createdAt:     l.createdAt,
        opportunityId: l.opportunity?.id,
      }));

    return crmItems;
  }, [leads, stageF, sourceF, empF, search]);

  // ── KRA-aligned stats mapped from CRM lead stages ─────────────────────────
  // Outbound Calls  → all leads (each lead = an outreach attempt)
  // Connects        → leads that progressed past NEW_LEAD (CONTACTED+)
  // Qualified Leads → leads in QUALIFIED or later stages
  // Appointments    → leads in POC_DEMO stage

  const QUALIFIED_STAGES = ["QUALIFIED", "REQUIREMENT_GATHERED", "SOLUTION_PROPOSED", "POC_DEMO"];

  const scopedLeads     = empF ? leads.filter((l) => String(l.assignedToId) === empF) : leads;
  const kraOutbound     = scopedLeads.length;
  const kraConnects     = scopedLeads.filter((l) => l.stage !== "NEW_LEAD").length;
  const kraQualified    = scopedLeads.filter((l) => QUALIFIED_STAGES.includes(l.stage)).length;
  const kraAppointments = scopedLeads.filter((l) => l.stage === "POC_DEMO").length;

  // CRM stats — PROPOSAL_SENT leads are now in Opportunities, so not counted here
  const crmLeads    = merged.length;
  const crmQual     = merged.filter((m) =>
    ["QUALIFIED","REQUIREMENT_GATHERED","SOLUTION_PROPOSED","POC_DEMO"].includes(m.stage)).length;

  // ── Kanban columns — PROPOSAL_SENT removed (leads convert to Opportunities) ─

  const kanbanStages = LEAD_STAGES.filter((s) => s !== "PROPOSAL_SENT");
  const kanbanCols: KanbanColumn<MergedLead>[] = kanbanStages.map((s) => ({
    key:   s,
    label: LEAD_STAGE_LABELS[s as keyof typeof LEAD_STAGE_LABELS] ?? s,
    color: s === "NEW_LEAD"            ? "bg-slate-200 text-slate-700"
         : s === "CONTACTED"           ? "bg-blue-200 text-blue-700"
         : s === "QUALIFIED"           ? "bg-indigo-200 text-indigo-700"
         : s === "REQUIREMENT_GATHERED"? "bg-violet-200 text-violet-700"
         : s === "SOLUTION_PROPOSED"   ? "bg-purple-200 text-purple-700"
         : s === "POC_DEMO"            ? "bg-fuchsia-200 text-fuchsia-700"
         : "bg-orange-200 text-orange-700",
    items: merged.filter((m) => m.stage === s),
  }));

  async function handleKanbanMove(uid: number | string, _from: string, toStage: string) {
    const crmId = Number(String(uid).replace("crm-", ""));
    const res = await fetch(`/api/pipeline/leads/${crmId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
    if (res.ok) {
      const updated = await res.json();
      // PROPOSAL_SENT → opportunity auto-created: navigate to Opportunities
      if (toStage === "PROPOSAL_SENT" && updated.opportunity?.id) {
        router.push(`/pipeline/opportunities/${updated.opportunity.id}`);
        return;
      }
      setLeads((p) => p.map((l) => l.id === updated.id
        ? { ...l, stage: updated.stage, opportunity: updated.opportunity } : l));
      router.refresh();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* CRM lead stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Active Leads", value: crmLeads, color: "text-[#CC2229]" },
          { label: "Qualified+",   value: crmQual,  color: "text-indigo-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* KRA activity metrics (from CRM pipeline) */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          KRA Activity Metrics
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Outbound Calls",  value: kraOutbound,     color: "text-blue-700",   hint: "Total leads" },
            { label: "Connects",        value: kraConnects,     color: "text-cyan-700",   hint: "Contacted+" },
            { label: "Qualified Leads", value: kraQualified,    color: "text-green-700",  hint: "Qualified+" },
            { label: "Appointments",    value: kraAppointments, color: "text-violet-700", hint: "POC / Demo" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-blue-50 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input type="text" placeholder="Search company / contact…" value={search}
            data-testid="lead-search-input"
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          <select value={stageF} onChange={(e) => setStageF(e.target.value)}
            data-testid="lead-stage-filter"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All Stages</option>
            {LEAD_STAGES.filter((s) => s !== "PROPOSAL_SENT").map((s) => (
              <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>
            ))}
          </select>
          <select value={sourceF} onChange={(e) => setSourceF(e.target.value)}
            data-testid="lead-source-filter"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All Sources</option>
            {leadSources.map((s) => <option key={s}>{s}</option>)}
          </select>
          {isManager && (
            <select value={empF} onChange={(e) => setEmpF(e.target.value)}
              data-testid="lead-owner-filter"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              <option value="">All Owners</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-2 items-center shrink-0">
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button onClick={() => setView("table")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "table" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
              ☰ Table
            </button>
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "kanban" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
              ⊞ Kanban
            </button>
          </div>
          <button onClick={() => setShowImportModal(true)}
            data-testid="lead-import-button"
            className="border border-[#CC2229] text-[#CC2229] text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[#CC2229] hover:text-white transition whitespace-nowrap">
            ⬆ Import
          </button>
          <button onClick={() => setShowLeadForm(true)}
            data-testid="lead-new-button"
            className="bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition">
            + New Lead
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">{merged.length} active leads</p>

      {/* New lead modal */}
      {showLeadForm && (
        <LeadFormModal
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          isManager={isManager}
          onClose={() => setShowLeadForm(false)}
          onCreated={handleLeadCreated}
          sources={leadSources}
        />
      )}

      {/* Bulk import modal */}
      {showImportModal && (
        <BulkImportModal
          employees={employees}
          isManager={isManager}
          currentEmployeeId={currentEmployeeId}
          onClose={() => setShowImportModal(false)}
          onImported={(count) => {
            router.refresh();
            setShowImportModal(false);
          }}
        />
      )}

      {/* Kanban */}
      {view === "kanban" && (
        <KanbanBoard<MergedLead>
          columns={kanbanCols}
          getId={(m) => m.uid}
          renderCard={(m) => <LeadCard lead={leads.find((l) => l.id === m.crmId)!} />}
          onMove={handleKanbanMove}
        />
      )}

      {/* Table */}
      {view === "table" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          {merged.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">No leads found.</p>
              <button onClick={() => setShowLeadForm(true)}
                className="mt-2 text-sm text-[#CC2229] hover:underline">Create your first lead →</button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm" data-testid="lead-table">
              <thead className="bg-gray-50">
                <tr>
                  {["Company / Contact", "Stage", "SLA", "Value", "Source", "Owner", "Updated", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {merged.map((m) => {
                  const slaStatus = m.createdAt ? (() => {
                    const elapsedH = (Date.now() - new Date(m.createdAt).getTime()) / 3_600_000;
                    if (m.stage === "NEW_LEAD") {
                      if (elapsedH >= 4)  return { label: "Breach", cls: "bg-red-100 text-red-700" };
                      if (elapsedH >= 3)  return { label: "At risk", cls: "bg-amber-100 text-amber-700" };
                      return { label: "OK", cls: "bg-green-50 text-green-700" };
                    }
                    const days = Math.floor(elapsedH / 24);
                    if (days > 30) return { label: `${days}d stale`, cls: "bg-red-100 text-red-700" };
                    if (days > 14) return { label: `${days}d`, cls: "bg-amber-100 text-amber-700" };
                    return null;
                  })() : null;

                  return (
                    <tr key={m.uid} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{m.companyName}</p>
                        <p className="text-xs text-gray-400">{m.contactPerson}</p>
                        {m.leadTitle && <p className="text-xs text-gray-500 italic">{m.leadTitle}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <LeadStageBadge stage={m.stage} />
                      </td>
                      <td className="px-4 py-3">
                        {slaStatus ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${slaStatus.cls}`}>
                            {slaStatus.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#CC2229]">
                          {(m.expectedValue ?? 0) > 0 ? `₹${(m.expectedValue ?? 0).toFixed(1)}L` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.source}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{m.ownerName}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{m.updatedAt?.slice(0, 10)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.opportunityId ? (
                          <Link href={`/pipeline/opportunities/${m.opportunityId}`}
                            className="text-xs text-amber-700 hover:underline font-medium">
                            Opportunity →
                          </Link>
                        ) : (
                          <Link href={`/pipeline/leads/${m.crmId}`}
                            className="text-xs text-[#CC2229] hover:underline font-medium">View →</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
