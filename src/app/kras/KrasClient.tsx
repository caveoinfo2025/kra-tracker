"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/components/ProgressBar";

type ReviewSerialized = {
  id: number;
  week: number;
  year: number;
  progress: number;
  score: number;
  notes: string;
};

type WeeklyCommitSerialized = {
  id: number;
  kraId: number;
  employeeId: number;
  week: number;
  year: number;
  commitText: string;
};

type KRASerialized = {
  id: number;
  title: string;
  description: string;
  target: string;
  deadline: string;
  weight: number;
  status: string;
  reviews: ReviewSerialized[];
  weeklyCommits: WeeklyCommitSerialized[];
};

type EmployeeData = {
  id: number;
  name: string;
  department: string;
  role: string;
  kras: KRASerialized[];
};

type Props = {
  isManager: boolean;
  employees: EmployeeData[];
  currentWeek: number;
  currentYear: number;
  myEmployeeId?: number;
};

// ── KRA reference rules ───────────────────────────────────────────────────────

const KRA_TEMPLATES = [
  {
    label: "Sales Revenue",
    titleHint: "Sales Revenue",
    dataSource: "Sales Funnel (Closed Won booking) + Collections (billing ex-GST) + GP%",
    targetFormat: "total sales revenue - booking: 120; average gross profit margin: 15; payment collections within due dates & credit days reduction: 0.9",
    description:
      "Tracks booking (Closed Won deals), billing (ex-GST collections), average GP%, and on-time payment collection rate. Billing target = 90% of booking automatically.",
    fields: [
      { key: "total sales revenue - booking", hint: "Booking target in ₹L (e.g. 120)" },
      { key: "average gross profit margin", hint: "GP% target (e.g. 15 for 15%)" },
      { key: "payment collections within due dates & credit days reduction", hint: "On-time rate 0-1 (e.g. 0.9 = 90%)" },
    ],
  },
  {
    label: "Focus Area Revenue",
    titleHint: "Focus Area Revenue Achievement",
    dataSource: "Sales Funnel (Closed Won) grouped by Solution Category",
    targetFormat: "network & security: 0.35; server & storage: 0.20; mssp services: 0.10; cloud security & services: 0.10",
    description:
      "Each value is a PROPORTION of the booking target (from the Sales Revenue KRA), not an absolute ₹L. E.g. 0.35 = 35% × booking target.",
    fields: [
      { key: "network & security", hint: "Proportion 0-1 (e.g. 0.35 = 35% of booking target)" },
      { key: "server & storage", hint: "Proportion 0-1 (e.g. 0.20)" },
      { key: "mssp services", hint: "Proportion 0-1 (e.g. 0.10)" },
      { key: "cloud security & services", hint: "Proportion 0-1 (e.g. 0.10)" },
    ],
  },
  {
    label: "Customer & Business Development",
    titleHint: "Customer & Business Development",
    dataSource: "Lead Generation (qualified flag) + Sales Funnel (new customer, Closed Won)",
    targetFormat: "qualified leads generation: 20; new customers: 8",
    description: "Counts qualified leads and new customer deals closed (Closed Won with New Customer flag).",
    fields: [
      { key: "qualified leads generation", hint: "Number of qualified leads target (e.g. 20)" },
      { key: "new customers", hint: "New customer deals target (e.g. 8)" },
    ],
  },
  {
    label: "Sales Management",
    titleHint: "Sales Management & Operational Excellence",
    dataSource: "Sales Funnel (PoC flag, new customer Closed Won, active pipeline)",
    targetFormat: 'non-obligatory" proof of concept (poc): 4; new customers or upsell closure: 8; pipeline: 2',
    description:
      "PoC count, new customers/upsell closed, and pipeline coverage ratio. Pipeline multiplier uses booking target from the Sales Revenue KRA.",
    fields: [
      { key: 'non-obligatory" proof of concept (poc)', hint: "PoC count target (e.g. 4)" },
      { key: "new customers or upsell closure", hint: "Deals target (e.g. 8)" },
      { key: "pipeline", hint: "Pipeline multiplier — active pipeline must be this × booking target (e.g. 2 = 2×)" },
    ],
  },
  {
    label: "Lead Generation Activity",
    titleHint: "Lead Generation Activity",
    dataSource: "Lead Generation (Call + Connect activity counts)",
    targetFormat: "total outbound calls made: 180; meaningful connects achieved: 50",
    description: "Sums activityCount where activityType = 'Call' and 'Connect' from Lead Generation sheet.",
    fields: [
      { key: "total outbound calls made", hint: "Call count target (e.g. 180)" },
      { key: "meaningful connects achieved", hint: "Connect count target (e.g. 50)" },
    ],
  },
  {
    label: "Pipeline Building",
    titleHint: "Pipeline Building & Qualification",
    dataSource: "Lead Generation (qualified leads, meetings)",
    targetFormat: "qualified leads generated: 25; appointments fixed for bdm / sales closure team: 25",
    description: "Qualified lead count and meeting (appointment) count from Lead Generation sheet.",
    fields: [
      { key: "qualified leads generated", hint: "Qualified lead count target (e.g. 25)" },
      { key: "appointments fixed for bdm / sales closure team", hint: "Meeting count target (e.g. 25)" },
    ],
  },
  {
    label: "Funnel Creation",
    titleHint: "Funnel Creation & Pipeline Management",
    dataSource: "Sales Funnel (all opportunities — value and count)",
    targetFormat: "total funnel / pipeline value created (₹ lakhs): 75; number of funnel opportunities created: 10",
    description:
      "Total pipeline deal value (₹L) weighted 75% and opportunity count weighted 25%.",
    fields: [
      { key: "total funnel / pipeline value created (₹ lakhs)", hint: "Pipeline value target in ₹L (e.g. 75)" },
      { key: "number of funnel opportunities created", hint: "Opportunity count target (e.g. 10)" },
    ],
  },
  {
    label: "Revenue & Profitability (Team)",
    titleHint: "Revenue & Profitability",
    dataSource: "Sales Funnel — ALL employees (Closed Won)",
    targetFormat: "total team booking target achievement (₹ lakhs): 500",
    description: "Team-wide Closed Won booking. Use for Head of Sales role.",
    fields: [
      { key: "total team booking target achievement (₹ lakhs)", hint: "Team booking target in ₹L (e.g. 500)" },
    ],
  },
  {
    label: "Market Growth (Team)",
    titleHint: "Market Growth & Business Development",
    dataSource: "Sales Funnel — ALL employees (new customer Closed Won count)",
    targetFormat: "new logos / strategic accounts acquired by team: 10",
    description: "Team-wide new logo count from Closed Won deals with New Customer flag.",
    fields: [
      { key: "new logos / strategic accounts acquired by team", hint: "New logo count target (e.g. 10)" },
    ],
  },
  {
    label: "Pipeline Health (Team)",
    titleHint: "Pipeline Health & Strategic Execution",
    dataSource: "Sales Funnel — ALL employees (active pipeline value)",
    targetFormat: "total team pipeline coverage (₹ lakhs): 1500",
    description: "Team-wide active pipeline deal value.",
    fields: [
      { key: "total team pipeline coverage (₹ lakhs)", hint: "Pipeline target in ₹L (e.g. 1500)" },
    ],
  },
  {
    label: "Sales Operations (Manual)",
    titleHint: "Sales Operations Excellence",
    dataSource: "Manual — no auto-compute",
    targetFormat: "Enter manually via Weekly Review",
    description: "No automatic data source. Progress must be entered manually each week via the Weekly Review.",
    fields: [],
  },
  {
    label: "Team Leadership (Manual)",
    titleHint: "Team Leadership & Talent Development",
    dataSource: "Manual — no auto-compute",
    targetFormat: "Enter manually via Weekly Review",
    description: "No automatic data source. Progress must be entered manually each week via the Weekly Review.",
    fields: [],
  },
  {
    label: "Marketing Activities (Manual)",
    titleHint: "Marketing Activities",
    dataSource: "Manual — no auto-compute",
    targetFormat: "Enter manually via Weekly Review",
    description: "No automatic data source. Progress must be entered manually each week via the Weekly Review.",
    fields: [],
  },
];

// ── KRA Add / Edit Modal ───────────────────────────────────────────────────────

function KRAFormModal({
  employeeId,
  editKRA,
  onClose,
}: {
  employeeId: number;
  editKRA: KRASerialized | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: editKRA?.title ?? "",
    description: editKRA?.description ?? "",
    target: editKRA?.target ?? "",
    deadline: editKRA?.deadline?.slice(0, 10) ?? "",
    weight: String(editKRA?.weight ?? 100),
    status: editKRA?.status ?? "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof KRA_TEMPLATES[number] | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  function applyTemplate(tpl: typeof KRA_TEMPLATES[number]) {
    setSelectedTemplate(tpl);
    setForm((f) => ({
      ...f,
      title: f.title || tpl.titleHint,
      target: tpl.targetFormat === "Enter manually via Weekly Review" ? "" : tpl.targetFormat,
    }));
    setShowGuide(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, weight: Number(form.weight) };
      if (editKRA) {
        const res = await fetch(`/api/kras/${editKRA.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        const res = await fetch(`/api/employees/${employeeId}/kras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create failed");
      }
      router.refresh();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const f = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editKRA ? "Edit KRA" : "Add KRA"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
          )}

          {/* Template picker */}
          {!editKRA && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KRA Type <span className="text-gray-400 font-normal">(pick one to auto-fill targets)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {KRA_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                      selectedTemplate?.label === tpl.label
                        ? "bg-[#CC2229] text-white border-[#CC2229]"
                        : "border-gray-200 text-gray-600 hover:border-[#CC2229] hover:text-[#CC2229]"
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Guide panel */}
          {selectedTemplate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-blue-800">{selectedTemplate.label}</p>
                <button onClick={() => setShowGuide(!showGuide)} className="text-blue-500 text-xs whitespace-nowrap">
                  {showGuide ? "Hide guide" : "Show guide"}
                </button>
              </div>
              {showGuide && (
                <>
                  <p className="text-blue-700">{selectedTemplate.description}</p>
                  <p className="text-xs text-blue-600">
                    <span className="font-medium">Data source:</span> {selectedTemplate.dataSource}
                  </p>
                  {selectedTemplate.fields.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Target fields:</p>
                      {selectedTemplate.fields.map((fl) => (
                        <div key={fl.key} className="text-xs text-blue-800 bg-white/60 rounded px-2 py-1">
                          <span className="font-mono text-blue-900">{fl.key}:</span>{" "}
                          <span className="text-blue-600">{fl.hint}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => f("title", e.target.value)}
                placeholder="e.g. Sales Revenue Achievement"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                The title keyword determines which auto-compute rule is applied (see guide above).
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={2}
                value={form.description}
                onChange={(e) => f("description", e.target.value)}
                placeholder="Describe what this KRA measures"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229] resize-none"
              />
            </div>

            {/* Target string */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target String
                <span className="text-gray-400 font-normal ml-1">
                  (semicolon-separated key: value pairs)
                </span>
              </label>
              <textarea
                rows={3}
                value={form.target}
                onChange={(e) => f("target", e.target.value)}
                placeholder="e.g. total sales revenue - booking: 120; average gross profit margin: 15"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#CC2229] resize-none"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Format: <code className="bg-gray-100 px-1 rounded">key1: value1; key2: value2</code> — keys must match the engine rules exactly (see guide above).
              </p>
            </div>

            {/* Deadline + Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  required
                  type="date"
                  value={form.deadline}
                  onChange={(e) => f("deadline", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  value={form.weight}
                  onChange={(e) => f("weight", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
            </div>

            {/* Status (edit only) */}
            {editKRA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => f("status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50"
              >
                {loading ? "Saving…" : editKRA ? "Update KRA" : "Add KRA"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Full reference guide (always visible at bottom) */}
        <details className="border-t">
          <summary className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
            📖 Full Auto-Compute Rules Reference
          </summary>
          <div className="px-6 pb-5 pt-2 space-y-3 max-h-96 overflow-y-auto">
            {KRA_TEMPLATES.filter((t) => t.fields.length > 0).map((tpl) => (
              <div key={tpl.label} className="border rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800">{tpl.label}</p>
                <p className="text-xs text-gray-500 mb-1">
                  Title must contain: <code className="bg-gray-100 px-1 rounded">{tpl.titleHint.toLowerCase().split(" ").slice(0, 2).join(" ")}</code>
                  {" · "}{tpl.dataSource}
                </p>
                <code className="block text-xs bg-gray-50 border rounded p-2 text-gray-700 font-mono whitespace-pre-wrap">
                  {tpl.targetFormat}
                </code>
              </div>
            ))}
            <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
              <p className="text-sm font-semibold text-amber-800">Manual KRAs</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Titles containing <code className="bg-amber-100 px-1 rounded">sales operations</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">team leadership</code>, or{" "}
                <code className="bg-amber-100 px-1 rounded">marketing activities</code> — progress entered manually via Weekly Review. No auto-compute.
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

// ── Weekly commit input ────────────────────────────────────────────────────────

function CommitInput({
  kra,
  employeeId,
  currentWeek,
  currentYear,
}: {
  kra: KRASerialized;
  employeeId: number;
  currentWeek: number;
  currentYear: number;
}) {
  const router = useRouter();
  const existingCommit = kra.weeklyCommits[0];
  const [text, setText] = useState(existingCommit?.commitText ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/weekly-commits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, kraId: kra.id, week: currentWeek, year: currentYear, commitText: text }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2 items-start">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        onBlur={save}
        placeholder="My commit this week…"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229] resize-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-sm bg-[#CC2229] text-white px-3 py-2 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50 whitespace-nowrap"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}

// ── Employee KRA Card ─────────────────────────────────────────────────────────

function EmployeeKRACard({
  employee,
  isManager,
  currentWeek,
  currentYear,
  myEmployeeId,
}: {
  employee: EmployeeData;
  isManager: boolean;
  currentWeek: number;
  currentYear: number;
  myEmployeeId?: number;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editKRA, setEditKRA] = useState<KRASerialized | null>(null);

  const hasCommits = employee.kras.some((k) => k.weeklyCommits.length > 0);
  const isOwnProfile = myEmployeeId === employee.id;

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    const res = await fetch("/api/kra-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: employee.id }),
    });
    const data = await res.json();
    setSyncMsg(`Synced ${data.synced} KRAs (Wk ${data.week})`);
    setSyncing(false);
    router.refresh();
  }

  async function handleDelete(kraId: number) {
    if (!confirm("Delete this KRA? All reviews and commits will also be deleted.")) return;
    await fetch(`/api/kras/${kraId}`, { method: "DELETE" });
    router.refresh();
  }

  function openAdd() {
    setEditKRA(null);
    setFormOpen(true);
  }

  function openEdit(kra: KRASerialized) {
    setEditKRA(kra);
    setFormOpen(true);
  }

  return (
    <>
      {formOpen && (
        <KRAFormModal
          employeeId={employee.id}
          editKRA={editKRA}
          onClose={() => { setFormOpen(false); setEditKRA(null); }}
        />
      )}

      <div className="bg-white rounded-xl border shadow-sm p-5">
        {/* Card header */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{employee.name}</h2>
            <p className="text-xs text-gray-500">{employee.role} — {employee.department}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasCommits ? (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                Week {currentWeek} commit submitted
              </span>
            ) : (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                No commit for Week {currentWeek}
              </span>
            )}
            {isManager && (
              <>
                {syncMsg && (
                  <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                    {syncMsg}
                  </span>
                )}
                <button
                  onClick={openAdd}
                  className="text-sm bg-[#CC2229] text-white px-3 py-1.5 rounded-lg hover:bg-[#A81B21] transition"
                >
                  + Add KRA
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {syncing ? "Syncing…" : "⚡ Sync"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* KRA list */}
        {employee.kras.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No active KRAs.</p>
        ) : (
          <div className="space-y-4">
            {employee.kras.map((kra) => {
              const lastReview = kra.reviews[0];
              const prog = lastReview?.progress ?? 0;
              return (
                <div key={kra.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{kra.title}</p>
                      {lastReview && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{lastReview.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Weight: {kra.weight}% · Deadline: {kra.deadline.slice(0, 10)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lastReview && (
                        <span className="text-xs font-medium text-gray-600 bg-white border px-2 py-0.5 rounded">
                          Score: {lastReview.score}/10
                        </span>
                      )}
                      {isManager && (
                        <>
                          <button
                            onClick={() => openEdit(kra)}
                            className="text-xs border px-2 py-1 rounded text-blue-600 hover:bg-blue-50 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(kra.id)}
                            className="text-xs border px-2 py-1 rounded text-red-600 hover:bg-red-50 transition"
                          >
                            Del
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar value={prog} />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{prog}%</span>
                  </div>

                  {/* Weekly commit — employee's own KRAs only */}
                  {!isManager && isOwnProfile && (
                    <CommitInput
                      kra={kra}
                      employeeId={employee.id}
                      currentWeek={currentWeek}
                      currentYear={currentYear}
                    />
                  )}

                  {/* Manager sees commits read-only */}
                  {isManager && kra.weeklyCommits.length > 0 && (
                    <div className="mt-2 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                      <p className="text-xs text-blue-600 font-medium mb-0.5">Week {currentWeek} Commit:</p>
                      <p className="text-sm text-blue-800">{kra.weeklyCommits[0].commitText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function KrasClient({
  isManager,
  employees,
  currentWeek,
  currentYear,
  myEmployeeId,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? "KRA Dashboard" : `My KRAs — Week ${currentWeek}`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager
              ? `Week ${currentWeek}, ${currentYear} — all employees`
              : `Week ${currentWeek}, ${currentYear}`}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {employees.map((emp) => (
          <EmployeeKRACard
            key={emp.id}
            employee={emp}
            isManager={isManager}
            currentWeek={currentWeek}
            currentYear={currentYear}
            myEmployeeId={myEmployeeId}
          />
        ))}
      </div>
    </div>
  );
}
