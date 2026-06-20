"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, GitBranch, Target, Database,
  List, Sliders, ShieldCheck, Save, RotateCcw,
  ChevronRight, Info, CheckCircle, AlertCircle, Users,
  Receipt, BookUser, ClipboardCheck,
} from "lucide-react";
import RolesClient from "./RolesClient";

type Setting = {
  key: string;
  value: unknown;
  category: string;
  label: string;
  description: string;
};

const TABS = [
  { id: "roles",        label: "Roles & Access",    icon: Users         },
  { id: "pipeline",     label: "Pipeline",          icon: GitBranch     },
  { id: "sales_funnel", label: "Sales Funnel",       icon: Sliders       },
  { id: "collections",  label: "Collections",        icon: Database      },
  { id: "lead_gen",     label: "Lead Generation",    icon: List          },
  { id: "tasks",        label: "Tasks",              icon: CheckCircle   },
  { id: "daily_updates",label: "Daily Updates",      icon: List          },
  { id: "crm",          label: "CRM Master Data",    icon: Database      },
  { id: "kra",          label: "KRA Weights",        icon: Target        },
  { id: "kra_targets",  label: "KRA Targets",        icon: Target        },
  { id: "finance",      label: "Finance Ops",        icon: Receipt       },
  { id: "approvals",    label: "Approvals",          icon: ClipboardCheck},
  { id: "masters",      label: "Masters",            icon: BookUser      },
  { id: "system",       label: "System",             icon: Settings      },
];

// ── Value editors ────────────────────────────────────────────────────────────

function StringEditor({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
    />
  );
}

function NumberEditor({ value, onChange }: { value: number; onChange: (v: unknown) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
    />
  );
}

function StringArrayEditor({ value, onChange }: { value: string[]; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState(value.join("\n"));
  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
        }}
        rows={Math.min(value.length + 1, 10)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
        placeholder="One value per line"
      />
      <p className="text-xs text-gray-400 mt-1">One entry per line</p>
    </div>
  );
}

function ObjectEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError("");
          } catch {
            setError("Invalid JSON");
          }
        }}
        rows={8}
        className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C8102E] ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ScoringBandsEditor({
  value,
  onChange,
}: {
  value: { min: number; score: number }[];
  onChange: (v: unknown) => void;
}) {
  const [bands, setBands] = useState(value);
  function update(i: number, field: "min" | "score", v: number) {
    const next = bands.map((b, j) => (j === i ? { ...b, [field]: v } : b));
    setBands(next);
    onChange(next);
  }
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 px-1 mb-2">
        <span>Progress ≥ %</span><span>Score (1-10)</span><span></span>
      </div>
      {bands.map((b, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 items-center">
          <input
            type="number" min={0} max={200} value={b.min}
            onChange={(e) => update(i, "min", Number(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          />
          <input
            type="number" min={1} max={10} value={b.score}
            onChange={(e) => update(i, "score", Number(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          />
          <span className="text-xs text-gray-400">→ Score {b.score}</span>
        </div>
      ))}
    </div>
  );
}

function WeightsEditor({
  value,
  onChange,
}: {
  value: Record<string, number>;
  onChange: (v: unknown) => void;
}) {
  const [weights, setWeights] = useState(value);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  function update(k: string, v: number) {
    const next = { ...weights, [k]: v };
    setWeights(next);
    onChange(next);
  }
  return (
    <div className="space-y-2">
      {Object.entries(weights).map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-44 capitalize">{k.replace(/_/g, " ")}</span>
          <input
            type="number" min={0} max={1} step={0.005} value={v}
            onChange={(e) => update(k, Number(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-24"
          />
          <span className="text-xs text-gray-400">{(v * 100).toFixed(1)}%</span>
        </div>
      ))}
      <div className={`text-xs font-semibold mt-1 ${Math.abs(total - 1) > 0.01 ? "text-red-500" : "text-green-600"}`}>
        Total: {(total * 100).toFixed(1)}% {Math.abs(total - 1) > 0.01 ? "⚠ must equal 100%" : "✓"}
      </div>
    </div>
  );
}

function ValueEditor({ setting, onChange }: { setting: Setting; onChange: (k: string, v: unknown) => void }) {
  const { key, value } = setting;

  if (key === "kra.scoring_bands") {
    return <ScoringBandsEditor value={value as { min: number; score: number }[]} onChange={(v) => onChange(key, v)} />;
  }
  if (key.startsWith("kra.weights.")) {
    return <WeightsEditor value={value as Record<string, number>} onChange={(v) => onChange(key, v)} />;
  }
  if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
    return <StringArrayEditor value={value as string[]} onChange={(v) => onChange(key, v)} />;
  }
  if (typeof value === "number") {
    return <NumberEditor value={value} onChange={(v) => onChange(key, v)} />;
  }
  if (typeof value === "string") {
    return <StringEditor value={value} onChange={(v) => onChange(key, v)} />;
  }
  if (typeof value === "object" && value !== null) {
    return <ObjectEditor value={value as Record<string, unknown>} onChange={(v) => onChange(key, v)} />;
  }
  return <span className="text-sm text-gray-400">Unsupported type</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminClient({ settings }: { settings: Setting[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("roles");
  const [dirty, setDirty] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const tabSettings = settings.filter((s) => s.category === activeTab);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDirty((d) => ({ ...d, [key]: value }));
  }, []);

  const currentValue = (s: Setting) => (s.key in dirty ? dirty[s.key] : s.value);

  async function save() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: dirty }),
      });
      const data = await res.json();
      const allOk = data.results?.every((r: { ok: boolean }) => r.ok) ?? false;
      if (allOk) {
        setDirty({});
        setToast({ type: "ok", msg: "Settings saved successfully" });
        router.refresh();
      } else {
        setToast({ type: "err", msg: "Some settings failed to save" });
      }
    } catch {
      setToast({ type: "err", msg: "Network error — changes not saved" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  function reset() {
    setDirty({});
  }

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb" }}>
      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "#C8102E", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: 0 }}>Admin Panel</h1>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Configuration &amp; Rules — no CRM data shown here</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {hasDirty && (
              <button
                onClick={reset}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 13, color: "#6b7280" }}
              >
                <RotateCcw size={14} /> Discard
              </button>
            )}
            <button
              onClick={save}
              disabled={!hasDirty || saving}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
                borderRadius: 8, border: "none",
                background: hasDirty ? "#C8102E" : "#e5e7eb",
                color: hasDirty ? "#fff" : "#9ca3af",
                cursor: hasDirty ? "pointer" : "default",
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Save size={14} /> {saving ? "Saving…" : `Save${hasDirty ? ` (${Object.keys(dirty).length})` : ""}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 18px", borderRadius: 10,
          background: toast.type === "ok" ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${toast.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: toast.type === "ok" ? "#166534" : "#991b1b",
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px", display: "flex", gap: 24 }}>
        {/* ── Sidebar tabs ── */}
        <nav style={{ width: 200, flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const dirtyCount = settings
                .filter((s) => s.category === tab.id && s.key in dirty)
                .length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 16px", border: "none", cursor: "pointer", textAlign: "left",
                    background: isActive ? "#fff5f5" : "transparent",
                    borderLeft: isActive ? "3px solid #C8102E" : "3px solid transparent",
                    color: isActive ? "#C8102E" : "#374151",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <Icon size={15} />
                  <span style={{ flex: 1 }}>{tab.label}</span>
                  {dirtyCount > 0 && (
                    <span style={{
                      background: "#C8102E", color: "#fff",
                      borderRadius: 999, fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", minWidth: 18, textAlign: "center",
                    }}>{dirtyCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Settings panel ── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {activeTab === "roles" ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8 }}>
                <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                  <strong>Legacy Roles &amp; Access is retained for reference only.</strong> Changes made here do not affect
                  real permission decisions. Runtime permissions are managed from <strong>Settings &gt; Identity</strong>.
                </p>
              </div>
              <RolesClient />
            </>
          ) : tabSettings.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 40, textAlign: "center", color: "#9ca3af" }}>
              No settings in this category yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tabSettings.map((s) => {
                const isDirty = s.key in dirty;
                return (
                  <div
                    key={s.key}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      border: `1px solid ${isDirty ? "#fca5a5" : "#e5e7eb"}`,
                      padding: 20,
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{s.label}</span>
                          {isDirty && (
                            <span style={{ fontSize: 10, background: "#fef2f2", color: "#C8102E", borderRadius: 999, padding: "2px 8px", fontWeight: 600 }}>
                              MODIFIED
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                            <Info size={12} color="#9ca3af" />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{s.description}</span>
                          </div>
                        )}
                      </div>
                      <code style={{ fontSize: 11, color: "#9ca3af", background: "#f9fafb", padding: "2px 8px", borderRadius: 4 }}>
                        {s.key}
                      </code>
                    </div>
                    <ValueEditor
                      setting={{ ...s, value: currentValue(s) }}
                      onChange={handleChange}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
