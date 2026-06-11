"use client";

import { useState, useCallback } from "react";
import {
  Plug, List, Link2, KeyRound, Mail, FileCheck,
  Map, MessageCircle, BookOpen, ScrollText, Activity,
  CheckCircle, XCircle, Clock, RefreshCw, Plus, ChevronDown, ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: number; name: string; code: string; category: string;
  description: string; status: string;
  _count?: { connections: number };
}

interface Connection {
  id: number; providerId: number; connectionName: string;
  authType: string; configJson: string; secretRef: string | null;
  status: string; lastTestedAt: string | null; lastTestStatus: string | null;
  provider?: { name: string; code: string; category: string };
}

interface Credential {
  id: number; name: string; keyType: string;
  environmentVariableName: string; description: string;
  status: string; isResolved: boolean;
}

interface IntegrationLog {
  id: number; connectionId: number; module: string; event: string;
  status: string; errorMessage: string | null; createdAt: string;
  connection?: { connectionName: string; provider: { name: string; code: string } };
}

interface Props {
  initialProviders:   Provider[];
  initialConnections: Connection[];
  initialCredentials: Credential[];
  initialLogs:        IntegrationLog[];
}

// ── Constants ────────────────────────────────────────────────────────────────

type TabId = "overview" | "providers" | "connections" | "credentials" | "email"
           | "gst" | "maps" | "whatsapp" | "accounting" | "logs";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: "overview",     label: "Overview",       icon: Activity    },
  { id: "providers",    label: "Providers",      icon: List        },
  { id: "connections",  label: "Connections",    icon: Link2       },
  { id: "credentials",  label: "Credentials",    icon: KeyRound    },
  { id: "email",        label: "Email",          icon: Mail        },
  { id: "gst",          label: "GST / PAN",      icon: FileCheck   },
  { id: "maps",         label: "Google Maps",    icon: Map         },
  { id: "whatsapp",     label: "WhatsApp / SMS", icon: MessageCircle },
  { id: "accounting",   label: "Accounting",     icon: BookOpen    },
  { id: "logs",         label: "Logs",           icon: ScrollText  },
];

const CATEGORY_LABEL: Record<string, string> = {
  EMAIL:      "Email",
  GST:        "GST",
  PAN:        "PAN",
  MAPS:       "Maps",
  WHATSAPP:   "WhatsApp",
  SMS:        "SMS",
  TEAMS:      "Teams",
  ACCOUNTING: "Accounting",
  WEBHOOK:    "Webhook",
  CUSTOM_API: "Custom API",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    "#1F9D55",
  INACTIVE:  "var(--fg-4)",
  TEST_MODE: "#FF6B00",
  FAILED:    "var(--danger)",
  SUCCESS:   "#1F9D55",
  SKIPPED:   "var(--fg-4)",
};

const STATUS_BG: Record<string, string> = {
  ACTIVE:    "rgba(31,157,85,0.1)",
  INACTIVE:  "var(--bg-muted)",
  TEST_MODE: "rgba(255,107,0,0.1)",
  FAILED:    "rgba(200,16,46,0.08)",
  SUCCESS:   "rgba(31,157,85,0.1)",
  SKIPPED:   "var(--bg-muted)",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      color: STATUS_COLOR[status] ?? "var(--fg-3)",
      background: STATUS_BG[status] ?? "var(--bg-muted)",
      textTransform: "uppercase",
    }}>{status.replace("_", " ")}</span>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function IntegrationAdminClient({
  initialProviders,
  initialConnections,
  initialCredentials,
  initialLogs,
}: Props) {
  const [tab, setTab]               = useState<TabId>("overview");
  const [providers,   setProviders]   = useState(initialProviders);
  const [connections, setConnections] = useState(initialConnections);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [logs,        setLogs]        = useState(initialLogs);
  const [toast, setToast]             = useState("");

  // New-connection form
  const [showConnForm, setShowConnForm] = useState(false);
  const [connForm, setConnForm] = useState({
    providerId: "", connectionName: "", authType: "ENV_REFERENCE", secretRef: "",
  });
  const [connSaving, setConnSaving] = useState(false);

  // New-credential form
  const [showCredForm, setShowCredForm] = useState(false);
  const [credForm, setCredForm] = useState({
    name: "", keyType: "API_KEY", environmentVariableName: "", description: "",
  });
  const [credSaving, setCredSaving] = useState(false);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const reload = useCallback(async () => {
    const [p, c, cr, l] = await Promise.all([
      fetch("/api/admin/integrations/providers").then(r => r.json()),
      fetch("/api/admin/integrations/connections").then(r => r.json()),
      fetch("/api/admin/integrations/credentials").then(r => r.json()),
      fetch("/api/admin/integrations/logs?limit=50").then(r => r.json()),
    ]);
    setProviders(p); setConnections(c); setCredentials(cr); setLogs(l);
  }, []);

  async function handleProviderStatus(id: number, status: string) {
    const r = await fetch("/api/admin/integrations/providers", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) { flash("Provider updated"); await reload(); }
    else flash("Update failed");
  }

  async function handleConnectionStatus(id: number, status: string) {
    const r = await fetch("/api/admin/integrations/connections", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) { flash("Connection updated"); await reload(); }
    else flash("Update failed");
  }

  async function handleSaveConnection() {
    if (!connForm.providerId || !connForm.connectionName || !connForm.authType) {
      flash("Provider, name and auth type are required"); return;
    }
    setConnSaving(true);
    const r = await fetch("/api/admin/integrations/connections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId:     Number(connForm.providerId),
        connectionName: connForm.connectionName,
        authType:       connForm.authType,
        secretRef:      connForm.secretRef.trim() || undefined,
      }),
    });
    setConnSaving(false);
    if (r.ok) {
      flash("Connection created"); setShowConnForm(false);
      setConnForm({ providerId: "", connectionName: "", authType: "ENV_REFERENCE", secretRef: "" });
      await reload();
    } else {
      const err = await r.json().catch(() => ({}));
      flash(err.error ?? "Failed to create connection");
    }
  }

  async function handleSaveCredential() {
    if (!credForm.name || !credForm.environmentVariableName) {
      flash("Name and env variable name are required"); return;
    }
    setCredSaving(true);
    const r = await fetch("/api/admin/integrations/credentials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:                   credForm.name,
        keyType:                credForm.keyType,
        environmentVariableName: credForm.environmentVariableName.trim().toUpperCase(),
        description:            credForm.description,
      }),
    });
    setCredSaving(false);
    if (r.ok) {
      flash("Credential reference created"); setShowCredForm(false);
      setCredForm({ name: "", keyType: "API_KEY", environmentVariableName: "", description: "" });
      await reload();
    } else {
      const err = await r.json().catch(() => ({}));
      flash(err.error ?? "Failed to create credential");
    }
  }

  async function handleTest(connectionId: number) {
    flash("Testing connection…");
    const r = await fetch("/api/admin/integrations/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    const res = await r.json();
    flash(res.success ? `Test passed (${res.latencyMs}ms)` : `Test failed: ${res.message}`);
    await reload();
  }

  // ── Tab content ────────────────────────────────────────────────────────────

  function renderOverview() {
    const active   = providers.filter(p => p.status === "ACTIVE").length;
    const testMode = providers.filter(p => p.status === "TEST_MODE").length;
    const connActive = connections.filter(c => c.status === "ACTIVE").length;
    const connFailed = connections.filter(c => c.status === "FAILED").length;
    const credsSet   = credentials.filter(c => c.isResolved).length;
    const recentFail = logs.filter(l => l.status === "FAILED").length;

    const kpis = [
      { label: "Active Providers",     value: active,      color: "#1F9D55" },
      { label: "Test Mode",            value: testMode,    color: "#FF6B00" },
      { label: "Active Connections",   value: connActive,  color: "#0066FF" },
      { label: "Failed Connections",   value: connFailed,  color: "#C8102E" },
      { label: "Credentials Set",      value: `${credsSet}/${credentials.length}`, color: "#7C3AED" },
      { label: "Recent Failures (50)", value: recentFail,  color: recentFail > 0 ? "#C8102E" : "#1F9D55" },
    ];

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {kpis.map(k => (
            <div key={k.label} className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${k.color}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: "var(--font-display)" }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--fg-2)" }}>Configured Connections</h3>
        {connections.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--fg-4)", padding: "24px 0" }}>No connections yet. Go to Connections tab to add one.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Connection", "Provider", "Auth", "Status", "Last Test", ""].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < connections.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{c.connectionName}</td>
                    <td style={{ padding: "10px 14px", color: "var(--fg-3)" }}>{c.provider?.name ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--fg-4)", fontSize: 12 }}>{c.authType}</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--fg-4)" }}>
                      {c.lastTestedAt ? <>{fmtDate(c.lastTestedAt)} <StatusBadge status={c.lastTestStatus ?? "—"} /></> : "Never"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => handleTest(c.id)}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                        <RefreshCw size={10} /> Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderProviders() {
    const byCategory: Record<string, Provider[]> = {};
    for (const p of providers) {
      (byCategory[p.category] ??= []).push(p);
    }
    const categories = Object.keys(byCategory).sort();
    const statusCycle: Record<string, string> = {
      INACTIVE:  "TEST_MODE",
      TEST_MODE: "ACTIVE",
      ACTIVE:    "INACTIVE",
    };

    return (
      <div>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-4)", marginBottom: 8 }}>
              {CATEGORY_LABEL[cat] ?? cat}
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {byCategory[cat].map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderBottom: i < byCategory[cat].length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 1 }}>{p.description}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                    {p._count?.connections ?? 0} connection{(p._count?.connections ?? 0) !== 1 ? "s" : ""}
                  </div>
                  <StatusBadge status={p.status} />
                  <button onClick={() => handleProviderStatus(p.id, statusCycle[p.status] ?? "INACTIVE")}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--fg-3)" }}>
                    {statusCycle[p.status] === "TEST_MODE" ? "Enable Test" : statusCycle[p.status] === "ACTIVE" ? "Go Live" : "Deactivate"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>
            No providers. Run the seed script to populate defaults.
          </div>
        )}
      </div>
    );
  }

  function renderConnections() {
    const inputStyle: React.CSSProperties = {
      width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)",
      color: "var(--fg-1)", outline: "none", boxSizing: "border-box",
    };
    const labelStyle: React.CSSProperties = {
      fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase",
      letterSpacing: "0.06em", marginBottom: 4, display: "block",
    };

    return (
      <div>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--fg-4)" }}>
            Connections link your system to external services using env var references — never raw secrets.
          </div>
          <button onClick={() => setShowConnForm(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: showConnForm ? "var(--bg-muted)" : "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--fg-2)" }}>
            <Plus size={13} /> New Connection
          </button>
        </div>

        {/* Inline form */}
        {showConnForm && (
          <div className="card" style={{ padding: "16px 18px", marginBottom: 16, border: "1px solid rgba(0,102,255,0.2)", background: "rgba(0,102,255,0.03)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--fg-1)" }}>New Connection</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Provider *</label>
                <select value={connForm.providerId} onChange={e => setConnForm(f => ({ ...f, providerId: e.target.value }))} style={inputStyle}>
                  <option value="">— select provider —</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({CATEGORY_LABEL[p.category] ?? p.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Connection Name *</label>
                <input value={connForm.connectionName} onChange={e => setConnForm(f => ({ ...f, connectionName: e.target.value }))}
                  placeholder="e.g. Office SMTP" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Auth Type *</label>
                <select value={connForm.authType} onChange={e => setConnForm(f => ({ ...f, authType: e.target.value }))} style={inputStyle}>
                  <option value="ENV_REFERENCE">ENV_REFERENCE</option>
                  <option value="API_KEY">API_KEY</option>
                  <option value="OAUTH">OAUTH</option>
                  <option value="WEBHOOK">WEBHOOK</option>
                  <option value="BASIC_AUTH">BASIC_AUTH</option>
                  <option value="NONE">NONE</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Credential Env Var</label>
                <input value={connForm.secretRef} onChange={e => setConnForm(f => ({ ...f, secretRef: e.target.value }))}
                  placeholder="e.g. SMTP_PASSWORD" style={inputStyle} />
                <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3 }}>
                  Enter the environment variable name — not the actual key value.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveConnection} disabled={connSaving}
                style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#0066FF", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: connSaving ? "not-allowed" : "pointer", opacity: connSaving ? 0.7 : 1 }}>
                {connSaving ? "Saving…" : "Create Connection"}
              </button>
              <button onClick={() => setShowConnForm(false)}
                style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 12.5, cursor: "pointer", color: "var(--fg-3)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {connections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 8 }}>
            <Plug size={28} style={{ marginBottom: 8, color: "var(--fg-4)" }} /><br />
            No connections yet. Click <strong>New Connection</strong> above to create one.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Provider", "Auth Type", "Credential Ref", "Status", "Last Test", ""].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < connections.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{c.connectionName}</td>
                    <td style={{ padding: "10px 14px", color: "var(--fg-3)" }}>
                      <div>{c.provider?.name ?? "—"}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-4)" }}>{CATEGORY_LABEL[c.provider?.category ?? ""] ?? ""}</div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--fg-4)" }}>{c.authType}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {c.secretRef
                        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>[set]</span>
                        : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--fg-4)", whiteSpace: "nowrap" }}>
                      {c.lastTestedAt ? fmtDate(c.lastTestedAt) : "Never"}
                      {c.lastTestStatus && <> <StatusBadge status={c.lastTestStatus} /></>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => handleTest(c.id)}
                          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <RefreshCw size={10} /> Test
                        </button>
                        {c.status !== "ACTIVE" && (
                          <button onClick={() => handleConnectionStatus(c.id, "ACTIVE")}
                            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(31,157,85,0.3)", background: "transparent", cursor: "pointer", color: "#1F9D55" }}>
                            Activate
                          </button>
                        )}
                        {c.status === "ACTIVE" && (
                          <button onClick={() => handleConnectionStatus(c.id, "INACTIVE")}
                            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(200,16,46,0.3)", background: "transparent", cursor: "pointer", color: "var(--danger)" }}>
                            Disable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderCredentials() {
    const inputStyle: React.CSSProperties = {
      width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)",
      color: "var(--fg-1)", outline: "none", boxSizing: "border-box",
    };
    const labelStyle: React.CSSProperties = {
      fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase",
      letterSpacing: "0.06em", marginBottom: 4, display: "block",
    };

    return (
      <div>
        {/* Security notice + toolbar row */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, padding: "10px 14px", background: "rgba(124,58,237,0.06)", borderRadius: 6, border: "1px solid rgba(124,58,237,0.2)", fontSize: 12.5, color: "var(--fg-2)" }}>
            <strong>Security:</strong> Credentials are referenced by environment variable name only.
            The actual key value is never stored in the database and never returned to the browser.
            Set the value in your <code style={{ fontFamily: "var(--font-mono)" }}>.env</code> file.
          </div>
          <button onClick={() => setShowCredForm(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: showCredForm ? "var(--bg-muted)" : "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--fg-2)", whiteSpace: "nowrap" }}>
            <Plus size={13} /> New Credential
          </button>
        </div>

        {/* Inline form */}
        {showCredForm && (
          <div className="card" style={{ padding: "16px 18px", marginBottom: 16, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.03)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--fg-1)" }}>Register Credential Reference</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Display Name *</label>
                <input value={credForm.name} onChange={e => setCredForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SMTP Password" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Key Type</label>
                <select value={credForm.keyType} onChange={e => setCredForm(f => ({ ...f, keyType: e.target.value }))} style={inputStyle}>
                  <option value="API_KEY">API_KEY</option>
                  <option value="SECRET">SECRET</option>
                  <option value="PASSWORD">PASSWORD</option>
                  <option value="TOKEN">TOKEN</option>
                  <option value="WEBHOOK_SECRET">WEBHOOK_SECRET</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Environment Variable Name *</label>
                <input value={credForm.environmentVariableName} onChange={e => setCredForm(f => ({ ...f, environmentVariableName: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SMTP_PASSWORD" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
                <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3 }}>
                  Add this variable to your .env file with the actual key value.
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input value={credForm.description} onChange={e => setCredForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note about what this key is for" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveCredential} disabled={credSaving}
                style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: credSaving ? "not-allowed" : "pointer", opacity: credSaving ? 0.7 : 1 }}>
                {credSaving ? "Saving…" : "Register Credential"}
              </button>
              <button onClick={() => setShowCredForm(false)}
                style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 12.5, cursor: "pointer", color: "var(--fg-3)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {credentials.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 8 }}>
            <KeyRound size={28} style={{ marginBottom: 8 }} /><br />
            No credential references. Click <strong>New Credential</strong> above to register one.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Type", "Env Variable", "Description", "Resolved", "Status"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {credentials.map((cr, i) => (
                  <tr key={cr.id} style={{ borderBottom: i < credentials.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{cr.name}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--fg-4)" }}>{cr.keyType}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{cr.environmentVariableName}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--fg-3)" }}>{cr.description || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {cr.isResolved
                        ? <span style={{ color: "#1F9D55", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><CheckCircle size={12} /> Set</span>
                        : <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><XCircle size={12} /> Not set</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={cr.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderCategoryInfo(
    category: string,
    fields: Array<{ label: string; envVar: string; desc: string }>,
  ) {
    const catConns = connections.filter(c => c.provider?.category === category);
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--fg-2)" }}>
            {catConns.length} {category} Connection{catConns.length !== 1 ? "s" : ""}
          </h3>
          {catConns.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--fg-4)" }}>No connections for this category. Configure a provider and create a connection.</div>
          ) : catConns.map(c => (
            <div key={c.id} className="card" style={{ padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.connectionName}</span>
                <span style={{ marginLeft: 8 }}><StatusBadge status={c.status} /></span>
                {c.secretRef === "[set]"
                  ? <span style={{ marginLeft: 8, fontSize: 11, color: "#1F9D55" }}>✓ Credential configured</span>
                  : <span style={{ marginLeft: 8, fontSize: 11, color: "var(--danger)" }}>⚠ No credential</span>}
              </div>
              <button onClick={() => handleTest(c.id)}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                <RefreshCw size={10} /> Test
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--fg-2)" }}>Required Environment Variables</h3>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {fields.map((f, i) => {
              const cred = credentials.find(c => c.environmentVariableName === f.envVar);
              return (
                <div key={f.envVar} style={{
                  display: "flex", gap: 12, padding: "10px 14px", alignItems: "flex-start",
                  borderBottom: i < fields.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>{f.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{f.envVar}</span>
                    <div style={{ marginTop: 4, fontSize: 11, color: cred?.isResolved ? "#1F9D55" : "var(--fg-4)" }}>
                      {cred?.isResolved ? "✓ Set" : cred ? "⚠ Registered but not set in .env" : "Not registered"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderLogs() {
    return (
      <div>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>
            <Clock size={28} style={{ marginBottom: 8 }} /><br />No integration logs yet.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Time", "Connection", "Module", "Event", "Status", "Error"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--fg-4)", whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{l.connection?.connectionName ?? `#${l.connectionId}`}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-4)" }}>{l.connection?.provider.name}</div>
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--fg-3)" }}>{l.module || "—"}</td>
                    <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--fg-3)" }}>{l.event || "—"}</td>
                    <td style={{ padding: "9px 14px" }}><StatusBadge status={l.status} /></td>
                    <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--danger)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.errorMessage || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderContent() {
    switch (tab) {
      case "overview":    return renderOverview();
      case "providers":   return renderProviders();
      case "connections": return renderConnections();
      case "credentials": return renderCredentials();
      case "email":       return renderCategoryInfo("EMAIL", [
        { label: "SMTP Password / App Password", envVar: "SMTP_PASSWORD",     desc: "Password or app-specific password for your SMTP account" },
        { label: "Microsoft 365 Client Secret",  envVar: "M365_CLIENT_SECRET", desc: "Azure AD client secret for Microsoft Graph mail API" },
        { label: "Google Workspace API Key",     envVar: "GOOGLE_SMTP_APP_PASSWORD", desc: "App password for Google Workspace SMTP relay" },
      ]);
      case "gst":         return renderCategoryInfo("GST", [
        { label: "GST Validation API Key",  envVar: "GST_API_KEY",  desc: "API key for GSTIN validation service" },
        { label: "PAN Validation API Key",  envVar: "PAN_API_KEY",  desc: "API key for PAN verification service" },
      ]);
      case "maps":        return renderCategoryInfo("MAPS", [
        { label: "Google Maps API Key",     envVar: "GOOGLE_MAPS_API_KEY", desc: "Restricted Maps API key for geocoding and distance matrix" },
      ]);
      case "whatsapp":    return renderCategoryInfo("WHATSAPP", [
        { label: "WhatsApp Business Token", envVar: "WHATSAPP_TOKEN",    desc: "Meta Business API access token" },
        { label: "SMS Gateway API Key",     envVar: "SMS_GATEWAY_API_KEY", desc: "API key for your SMS gateway provider" },
        { label: "SMS Gateway Base URL",    envVar: "SMS_GATEWAY_URL",   desc: "Base URL of your SMS gateway API" },
      ]);
      case "accounting":  return renderCategoryInfo("ACCOUNTING", [
        { label: "Tally Export Endpoint",  envVar: "TALLY_EXPORT_URL",  desc: "Tally TDL HTTP listener URL for data export" },
        { label: "Webhook Secret",         envVar: "WEBHOOK_SECRET",    desc: "Shared secret for HMAC-signed webhook payloads" },
      ]);
      case "logs":        return renderLogs();
      default:            return null;
    }
  }

  return (
    <div style={{ maxWidth: 1100, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Plug size={18} color="#0066FF" />
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Integration Center</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--fg-4)", margin: 0 }}>
          Configure and monitor external service integrations. Credentials are resolved from environment variables only — never stored as plain text.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, flexWrap: "wrap", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "7px 12px",
                border: "none",
                borderBottom: active ? "2px solid #0066FF" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                color: active ? "#0066FF" : "var(--fg-3)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: -1,
              }}
            >
              <Icon size={12} strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {renderContent()}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 70,
          padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)",
          borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500,
          boxShadow: "var(--shadow-md)",
        }}>{toast}</div>
      )}
    </div>
  );
}
