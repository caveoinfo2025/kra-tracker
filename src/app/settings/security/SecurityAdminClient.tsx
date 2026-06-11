"use client";

import { useState, useCallback } from "react";
import {
  Lock, ShieldCheck, KeyRound, Smartphone, Clock,
  Globe, Database, ScrollText, CheckCircle, XCircle,
  AlertTriangle, Save,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PasswordPolicy {
  id?: number; minimumLength: number; requireUppercase: boolean;
  requireLowercase: boolean; requireNumber: boolean;
  requireSpecialCharacter: boolean; expiryDays: number;
  passwordHistoryCount: number; failedAttemptLimit: number;
  lockDurationMinutes: number; status: string;
}

interface MFAPolicy {
  id?: number; enabled: boolean; requiredRolesJson: string;
  methodsJson: string; rememberDeviceDays: number; status: string;
}

interface SessionPolicy {
  id?: number; idleTimeoutMinutes: number; maxSessionHours: number;
  allowConcurrentLogin: boolean; maxConcurrentSessions: number;
  rememberMeAllowed: boolean; status: string;
}

interface AccessPolicy {
  id?: number; ipRestrictionEnabled: boolean; allowedIpJson: string;
  businessHourRestriction: boolean; allowedHoursJson: string;
  locationRestrictionJson: string; status: string;
}

interface DataPolicy {
  id?: number; exportLimit: number; exportApprovalRequired: boolean;
  downloadRestriction: boolean; sensitiveFieldsJson: string;
  maskingRulesJson: string; status: string;
}

interface SecurityLog {
  id: number; userId: number | null; eventType: string;
  metadataJson: string; ipAddress: string | null;
  userAgent: string | null; createdAt: string;
}

interface Props {
  initialPasswordPolicy: PasswordPolicy | null;
  initialMFAPolicy:      MFAPolicy | null;
  initialSessionPolicy:  SessionPolicy | null;
  initialAccessPolicy:   AccessPolicy | null;
  initialDataPolicy:     DataPolicy | null;
  initialLogs:           SecurityLog[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD: PasswordPolicy = {
  minimumLength: 8, requireUppercase: true, requireLowercase: true,
  requireNumber: true, requireSpecialCharacter: false,
  expiryDays: 90, passwordHistoryCount: 5, failedAttemptLimit: 5,
  lockDurationMinutes: 30, status: "ACTIVE",
};
const DEFAULT_MFA: MFAPolicy = {
  enabled: false, requiredRolesJson: "[]", methodsJson: '["EMAIL"]',
  rememberDeviceDays: 30, status: "ACTIVE",
};
const DEFAULT_SESSION: SessionPolicy = {
  idleTimeoutMinutes: 480, maxSessionHours: 8, allowConcurrentLogin: true,
  maxConcurrentSessions: 3, rememberMeAllowed: true, status: "ACTIVE",
};
const DEFAULT_ACCESS: AccessPolicy = {
  ipRestrictionEnabled: false, allowedIpJson: "[]",
  businessHourRestriction: false,
  allowedHoursJson: '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
  locationRestrictionJson: "{}", status: "ACTIVE",
};
const DEFAULT_DATA: DataPolicy = {
  exportLimit: 1000, exportApprovalRequired: false, downloadRestriction: false,
  sensitiveFieldsJson: '["mobile","email","pan","aadhar"]',
  maskingRulesJson: "[]", status: "ACTIVE",
};

// ── Constants ─────────────────────────────────────────────────────────────────

type TabId = "overview" | "authentication" | "password" | "mfa" | "sessions" | "access" | "data" | "logs";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: "overview",        label: "Overview",       icon: ShieldCheck  },
  { id: "authentication",  label: "Authentication", icon: Lock         },
  { id: "password",        label: "Password Policy",icon: KeyRound     },
  { id: "mfa",             label: "MFA",            icon: Smartphone   },
  { id: "sessions",        label: "Sessions",       icon: Clock        },
  { id: "access",          label: "Access Rules",   icon: Globe        },
  { id: "data",            label: "Data Protection",icon: Database     },
  { id: "logs",            label: "Logs",           icon: ScrollText   },
];

const EVENT_COLOR: Record<string, string> = {
  LOGIN_SUCCESS:    "#1F9D55",
  LOGIN_FAILED:     "#C8102E",
  LOGOUT:           "var(--fg-4)",
  PASSWORD_CHANGED: "#FF6B00",
  ROLE_CHANGED:     "#7C3AED",
  EXPORT_REQUESTED: "#0066FF",
  EXPORT_BLOCKED:   "#C8102E",
  ACCESS_DENIED:    "#C8102E",
  POLICY_CHANGED:   "#FF6B00",
  MFA_CHALLENGED:   "#0066FF",
  MFA_PASSED:       "#1F9D55",
  MFA_FAILED:       "#C8102E",
  ACCOUNT_LOCKED:   "#C8102E",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// ── Shared form styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)",
  color: "var(--fg-1)", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 4, display: "block",
};
const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
};
const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 42, height: 22, borderRadius: 11,
      background: value ? "#1F9D55" : "var(--fg-4)",
      border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s",
    }}>
      <span style={{
        position: "absolute", top: 3, left: value ? 22 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div style={{ marginTop: 20, display: "flex" }}>
      <button onClick={onSave} disabled={saving}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 18px", borderRadius: 6, border: "none",
          background: "#C8102E", color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
        }}>
        <Save size={13} />
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SecurityAdminClient({
  initialPasswordPolicy, initialMFAPolicy, initialSessionPolicy,
  initialAccessPolicy, initialDataPolicy, initialLogs,
}: Props) {
  const [tab, setTab]         = useState<TabId>("overview");
  const [toast, setToast]     = useState("");
  const [saving, setSaving]   = useState(false);

  const [pwPolicy,  setPwPolicy]  = useState<PasswordPolicy>(initialPasswordPolicy ?? DEFAULT_PASSWORD);
  const [mfaPolicy, setMfaPolicy] = useState<MFAPolicy>(initialMFAPolicy ?? DEFAULT_MFA);
  const [sessPolicy,setSessPolicy]= useState<SessionPolicy>(initialSessionPolicy ?? DEFAULT_SESSION);
  const [accPolicy, setAccPolicy] = useState<AccessPolicy>(initialAccessPolicy ?? DEFAULT_ACCESS);
  const [dataPolicy,setDataPolicy]= useState<DataPolicy>(initialDataPolicy ?? DEFAULT_DATA);
  const [logs,      setLogs]      = useState<SecurityLog[]>(initialLogs);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  const reload = useCallback(async () => {
    const l = await fetch("/api/admin/security/logs?limit=50").then(r => r.json());
    setLogs(l);
  }, []);

  async function savePolicy(endpoint: string, data: Record<string, unknown>) {
    setSaving(true);
    const id = (data as { id?: number }).id;
    const method = id ? "PATCH" : "POST";
    const r = await fetch(endpoint, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (r.ok) {
      const saved = await r.json();
      flash("Policy saved");
      return saved;
    }
    const err = await r.json().catch(() => ({}));
    flash(err.error ?? "Save failed");
    return null;
  }

  // ── Overview ────────────────────────────────────────────────────────────────

  function renderOverview() {
    const failedLogins  = logs.filter(l => l.eventType === "LOGIN_FAILED").length;
    const policyChanges = logs.filter(l => l.eventType === "POLICY_CHANGED").length;
    const denied        = logs.filter(l => l.eventType === "ACCESS_DENIED").length;
    const locked        = logs.filter(l => l.eventType === "ACCOUNT_LOCKED").length;

    const kpis = [
      { label: "Password Policy",    value: pwPolicy.status,           color: pwPolicy.status === "ACTIVE" ? "#1F9D55" : "var(--fg-4)" },
      { label: "MFA",                value: mfaPolicy.enabled ? "ON" : "OFF", color: mfaPolicy.enabled ? "#1F9D55" : "#FF6B00" },
      { label: "Session Limit",      value: `${sessPolicy.maxSessionHours}h`,  color: "#0066FF" },
      { label: "IP Restriction",     value: accPolicy.ipRestrictionEnabled ? "ON" : "OFF", color: accPolicy.ipRestrictionEnabled ? "#1F9D55" : "var(--fg-4)" },
      { label: "Failed Logins (50)", value: failedLogins,  color: failedLogins  > 0 ? "#C8102E" : "#1F9D55" },
      { label: "Access Denied (50)", value: denied,        color: denied        > 0 ? "#C8102E" : "#1F9D55" },
      { label: "Policy Changes",     value: policyChanges, color: policyChanges > 0 ? "#FF6B00" : "var(--fg-4)" },
      { label: "Locked Accounts",    value: locked,        color: locked        > 0 ? "#C8102E" : "#1F9D55" },
    ];

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {kpis.map(k => (
            <div key={k.label} className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${k.color}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: "var(--font-display)" }}>{k.value}</div>
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Policy summary */}
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--fg-2)" }}>Active Policies</div>
            {[
              { label: "Password",      active: pwPolicy.status === "ACTIVE",           detail: `Min ${pwPolicy.minimumLength} chars, ${pwPolicy.expiryDays}d expiry` },
              { label: "MFA",           active: mfaPolicy.enabled,                      detail: mfaPolicy.enabled ? "Required for configured roles" : "Not enforced" },
              { label: "Session",       active: sessPolicy.status === "ACTIVE",          detail: `${sessPolicy.maxSessionHours}h max, ${sessPolicy.idleTimeoutMinutes}m idle` },
              { label: "IP Restriction",active: accPolicy.ipRestrictionEnabled,         detail: accPolicy.ipRestrictionEnabled ? "Allowlist enforced" : "No restriction" },
              { label: "Business Hours",active: accPolicy.businessHourRestriction,      detail: accPolicy.businessHourRestriction ? "Hours enforced" : "No restriction" },
              { label: "Data Export",   active: dataPolicy.status === "ACTIVE",          detail: `Limit ${dataPolicy.exportLimit} records` },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                {p.active
                  ? <CheckCircle size={13} color="#1F9D55" />
                  : <XCircle    size={13} color="var(--fg-4)" />}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--fg-4)", marginLeft: 6 }}>{p.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent events */}
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--fg-2)" }}>Recent Security Events</div>
            {logs.slice(0, 8).length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No events logged yet.</div>
            ) : logs.slice(0, 8).map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                  color: EVENT_COLOR[l.eventType] ?? "var(--fg-3)",
                  background: `${EVENT_COLOR[l.eventType] ?? "#888"}18`,
                }}>{l.eventType.replace(/_/g, " ")}</span>
                <span style={{ fontSize: 11.5, color: "var(--fg-4)", marginLeft: "auto", whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Authentication ────────────────────────────────────────────────────────────

  function renderAuthentication() {
    return (
      <div>
        <div style={{ padding: "12px 16px", background: "rgba(31,157,85,0.06)", borderRadius: 8, border: "1px solid rgba(31,157,85,0.2)", fontSize: 12.5, color: "var(--fg-2)", marginBottom: 20 }}>
          <strong>Backward compatible:</strong> Microsoft Entra ID SSO is the primary authentication method and is not affected by these policies.
          Policy configuration is for future enforcement layers and audit purposes.
        </div>
        <div style={gridStyle}>
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--fg-2)" }}>Current Authentication</div>
            {[
              { label: "Provider",      value: "Microsoft Entra ID (SSO)" },
              { label: "Protocol",      value: "OpenID Connect / OAuth 2.0" },
              { label: "MFA",           value: "Handled by Microsoft (if configured)" },
              { label: "Session",       value: "JWT via NextAuth v5" },
              { label: "Dev Bypass",    value: "dev_employee_id cookie (dev only)" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)", fontSize: 12.5 }}>
                <span style={{ color: "var(--fg-4)", fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: "var(--fg-2)" }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--fg-2)" }}>Security Posture</div>
            {[
              { label: "Password Storage", ok: true,  note: "No passwords stored — SSO only" },
              { label: "Session Tokens",   ok: true,  note: "JWT, server-side not stored" },
              { label: "Secret Exposure",  ok: true,  note: "All secrets in env vars only" },
              { label: "MFA (App-level)",  ok: mfaPolicy.enabled, note: mfaPolicy.enabled ? "Policy active" : "Not yet enforced" },
              { label: "IP Allowlist",     ok: accPolicy.ipRestrictionEnabled, note: accPolicy.ipRestrictionEnabled ? "Active" : "Not configured" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                {r.ok ? <CheckCircle size={13} color="#1F9D55" /> : <AlertTriangle size={13} color="#FF6B00" />}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--fg-4)", marginLeft: 6 }}>{r.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Password Policy ───────────────────────────────────────────────────────────

  function renderPasswordPolicy() {
    return (
      <div>
        <div style={{ marginBottom: 14, fontSize: 12.5, color: "var(--fg-4)" }}>
          Note: These rules apply to any application-managed passwords. SSO users are governed by Microsoft Entra ID policies.
        </div>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={gridStyle}>
            <div style={sectionStyle}>
              <label style={labelStyle}>Minimum Length</label>
              <input type="number" min={6} max={32} value={pwPolicy.minimumLength}
                onChange={e => setPwPolicy(p => ({ ...p, minimumLength: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Password Expiry (days, 0 = never)</label>
              <input type="number" min={0} max={365} value={pwPolicy.expiryDays}
                onChange={e => setPwPolicy(p => ({ ...p, expiryDays: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Failed Attempt Limit</label>
              <input type="number" min={1} max={20} value={pwPolicy.failedAttemptLimit}
                onChange={e => setPwPolicy(p => ({ ...p, failedAttemptLimit: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Lockout Duration (minutes)</label>
              <input type="number" min={1} max={1440} value={pwPolicy.lockDurationMinutes}
                onChange={e => setPwPolicy(p => ({ ...p, lockDurationMinutes: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Password History (reuse prevention)</label>
              <input type="number" min={0} max={24} value={pwPolicy.passwordHistoryCount}
                onChange={e => setPwPolicy(p => ({ ...p, passwordHistoryCount: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Complexity Requirements</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Require Uppercase (A–Z)",       key: "requireUppercase"        },
                { label: "Require Lowercase (a–z)",       key: "requireLowercase"        },
                { label: "Require Number (0–9)",          key: "requireNumber"           },
                { label: "Require Special Character (!@#…)", key: "requireSpecialCharacter" },
              ].map(r => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 6 }}>
                  <span style={{ fontSize: 12.5 }}>{r.label}</span>
                  <Toggle
                    value={pwPolicy[r.key as keyof PasswordPolicy] as boolean}
                    onChange={v => setPwPolicy(p => ({ ...p, [r.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <SaveBar saving={saving} onSave={async () => {
          const saved = await savePolicy("/api/admin/security/password", pwPolicy as unknown as Record<string, unknown>);
          if (saved) setPwPolicy(saved);
        }} />
      </div>
    );
  }

  // ── MFA ──────────────────────────────────────────────────────────────────────

  function renderMFA() {
    let methods: string[] = [];
    let requiredRoles: string[] = [];
    try { methods      = JSON.parse(mfaPolicy.methodsJson);      } catch { methods = ["EMAIL"]; }
    try { requiredRoles = JSON.parse(mfaPolicy.requiredRolesJson); } catch { requiredRoles = []; }

    const allMethods = ["EMAIL", "AUTHENTICATOR_APP", "SMS"];

    function toggleMethod(m: string) {
      const updated = methods.includes(m) ? methods.filter(x => x !== m) : [...methods, m];
      setMfaPolicy(p => ({ ...p, methodsJson: JSON.stringify(updated) }));
    }

    return (
      <div>
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(255,107,0,0.06)", borderRadius: 6, border: "1px solid rgba(255,107,0,0.2)", fontSize: 12.5, color: "var(--fg-2)" }}>
          <strong>Note:</strong> Enabling MFA here records the configuration. Actual enforcement requires integration with your login flow.
          Microsoft Entra ID's own MFA settings are not affected.
        </div>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Enable Application MFA</div>
              <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>Require second factor for configured roles</div>
            </div>
            <Toggle value={mfaPolicy.enabled} onChange={v => setMfaPolicy(p => ({ ...p, enabled: v }))} />
          </div>

          <div style={{ opacity: mfaPolicy.enabled ? 1 : 0.45, pointerEvents: mfaPolicy.enabled ? "auto" : "none" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Allowed MFA Methods</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allMethods.map(m => (
                  <button key={m} onClick={() => toggleMethod(m)}
                    style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                      border: methods.includes(m) ? "2px solid #0066FF" : "1px solid var(--border)",
                      background: methods.includes(m) ? "rgba(0,102,255,0.08)" : "transparent",
                      color: methods.includes(m) ? "#0066FF" : "var(--fg-3)",
                    }}>
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Required Roles (comma-separated, blank = all)</label>
                <input value={requiredRoles.join(", ")}
                  onChange={e => {
                    const roles = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                    setMfaPolicy(p => ({ ...p, requiredRolesJson: JSON.stringify(roles) }));
                  }}
                  placeholder="Finance Manager, Operations Head"
                  style={inputStyle} />
                <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3 }}>Leave blank to require for all users.</div>
              </div>
              <div>
                <label style={labelStyle}>Remember Device (days)</label>
                <input type="number" min={0} max={365} value={mfaPolicy.rememberDeviceDays}
                  onChange={e => setMfaPolicy(p => ({ ...p, rememberDeviceDays: Number(e.target.value) }))}
                  style={{ ...inputStyle, maxWidth: 100 }} />
              </div>
            </div>
          </div>
        </div>
        <SaveBar saving={saving} onSave={async () => {
          const saved = await savePolicy("/api/admin/security/mfa", mfaPolicy as unknown as Record<string, unknown>);
          if (saved) setMfaPolicy(saved);
        }} />
      </div>
    );
  }

  // ── Sessions ──────────────────────────────────────────────────────────────────

  function renderSessions() {
    return (
      <div>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={gridStyle}>
            <div style={sectionStyle}>
              <label style={labelStyle}>Idle Timeout (minutes)</label>
              <input type="number" min={5} max={1440} value={sessPolicy.idleTimeoutMinutes}
                onChange={e => setSessPolicy(p => ({ ...p, idleTimeoutMinutes: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 120 }} />
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3 }}>480 min = 8 hours</div>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Maximum Session Duration (hours)</label>
              <input type="number" min={1} max={24} value={sessPolicy.maxSessionHours}
                onChange={e => setSessPolicy(p => ({ ...p, maxSessionHours: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Max Concurrent Sessions per User</label>
              <input type="number" min={1} max={10} value={sessPolicy.maxConcurrentSessions}
                onChange={e => setSessPolicy(p => ({ ...p, maxConcurrentSessions: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 100 }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            {[
              { label: "Allow Concurrent Login", key: "allowConcurrentLogin", desc: "Same user from multiple devices" },
              { label: "Allow Remember Me",       key: "rememberMeAllowed",   desc: "Persist sessions across browser restarts" },
            ].map(r => (
              <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-muted)", borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{r.desc}</div>
                </div>
                <Toggle
                  value={sessPolicy[r.key as keyof SessionPolicy] as boolean}
                  onChange={v => setSessPolicy(p => ({ ...p, [r.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>
        <SaveBar saving={saving} onSave={async () => {
          const saved = await savePolicy("/api/admin/security/session", sessPolicy as unknown as Record<string, unknown>);
          if (saved) setSessPolicy(saved);
        }} />
      </div>
    );
  }

  // ── Access Rules ──────────────────────────────────────────────────────────────

  function renderAccessRules() {
    let allowedHours = { start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] };
    try { allowedHours = JSON.parse(accPolicy.allowedHoursJson); } catch { /* keep default */ }
    let allowedIPs: string[] = [];
    try { allowedIPs = JSON.parse(accPolicy.allowedIpJson); } catch { /* keep empty */ }

    return (
      <div>
        <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--fg-2)" }}>IP Restrictions</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 6 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Enable IP Allowlist</div>
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Only listed IPs / CIDR ranges can access</div>
            </div>
            <Toggle value={accPolicy.ipRestrictionEnabled} onChange={v => setAccPolicy(p => ({ ...p, ipRestrictionEnabled: v }))} />
          </div>
          {accPolicy.ipRestrictionEnabled && (
            <div>
              <label style={labelStyle}>Allowed IPs / CIDR (one per line)</label>
              <textarea rows={4} value={allowedIPs.join("\n")}
                onChange={e => {
                  const ips = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
                  setAccPolicy(p => ({ ...p, allowedIpJson: JSON.stringify(ips) }));
                }}
                placeholder={"192.168.1.0/24\n10.0.0.1"}
                style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }} />
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--fg-2)" }}>Business Hours Restriction</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 6 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Enforce Business Hours</div>
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Block access outside configured hours</div>
            </div>
            <Toggle value={accPolicy.businessHourRestriction} onChange={v => setAccPolicy(p => ({ ...p, businessHourRestriction: v }))} />
          </div>
          {accPolicy.businessHourRestriction && (
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Start Time</label>
                <input type="time" value={allowedHours.start}
                  onChange={e => setAccPolicy(p => ({ ...p, allowedHoursJson: JSON.stringify({ ...allowedHours, start: e.target.value }) }))}
                  style={{ ...inputStyle, maxWidth: 130 }} />
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input type="time" value={allowedHours.end}
                  onChange={e => setAccPolicy(p => ({ ...p, allowedHoursJson: JSON.stringify({ ...allowedHours, end: e.target.value }) }))}
                  style={{ ...inputStyle, maxWidth: 130 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Allowed Days</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                    <button key={d} onClick={() => {
                      const days = allowedHours.days.includes(i)
                        ? allowedHours.days.filter(x => x !== i)
                        : [...allowedHours.days, i].sort();
                      setAccPolicy(p => ({ ...p, allowedHoursJson: JSON.stringify({ ...allowedHours, days }) }));
                    }}
                      style={{ padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        border: allowedHours.days.includes(i) ? "2px solid #0066FF" : "1px solid var(--border)",
                        background: allowedHours.days.includes(i) ? "rgba(0,102,255,0.08)" : "transparent",
                        color: allowedHours.days.includes(i) ? "#0066FF" : "var(--fg-4)",
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <SaveBar saving={saving} onSave={async () => {
          const saved = await savePolicy("/api/admin/security/access", accPolicy as unknown as Record<string, unknown>);
          if (saved) setAccPolicy(saved);
        }} />
      </div>
    );
  }

  // ── Data Protection ───────────────────────────────────────────────────────────

  function renderDataProtection() {
    let sensitiveFields: string[] = [];
    try { sensitiveFields = JSON.parse(dataPolicy.sensitiveFieldsJson); } catch { sensitiveFields = []; }

    return (
      <div>
        <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--fg-2)" }}>Export Controls</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Export Record Limit</label>
              <input type="number" min={10} max={100000} value={dataPolicy.exportLimit}
                onChange={e => setDataPolicy(p => ({ ...p, exportLimit: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 120 }} />
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3 }}>Max records per export operation</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            {[
              { label: "Require Approval for Exports", key: "exportApprovalRequired", desc: "Manager must approve each export" },
              { label: "Restrict Downloads",            key: "downloadRestriction",    desc: "Non-managers cannot download" },
            ].map(r => (
              <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{r.desc}</div>
                </div>
                <Toggle
                  value={dataPolicy[r.key as keyof DataPolicy] as boolean}
                  onChange={v => setDataPolicy(p => ({ ...p, [r.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--fg-2)" }}>Sensitive Fields</div>
          <div style={{ fontSize: 12.5, color: "var(--fg-4)", marginBottom: 12 }}>
            These fields will be masked in export outputs for non-manager users.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {["mobile", "email", "pan", "aadhar", "bank_account", "gstin", "salary", "dob"].map(f => (
              <button key={f} onClick={() => {
                const updated = sensitiveFields.includes(f)
                  ? sensitiveFields.filter(x => x !== f)
                  : [...sensitiveFields, f];
                setDataPolicy(p => ({ ...p, sensitiveFieldsJson: JSON.stringify(updated) }));
              }}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: sensitiveFields.includes(f) ? "2px solid #C8102E" : "1px solid var(--border)",
                  background: sensitiveFields.includes(f) ? "rgba(200,16,46,0.08)" : "transparent",
                  color: sensitiveFields.includes(f) ? "#C8102E" : "var(--fg-4)",
                }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>
            Selected: {sensitiveFields.length === 0 ? "none" : sensitiveFields.join(", ")}
          </div>
        </div>

        <SaveBar saving={saving} onSave={async () => {
          const saved = await savePolicy("/api/admin/security/data-protection", dataPolicy as unknown as Record<string, unknown>);
          if (saved) setDataPolicy(saved);
        }} />
      </div>
    );
  }

  // ── Logs ──────────────────────────────────────────────────────────────────────

  function renderLogs() {
    return (
      <div>
        <div style={{ marginBottom: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={reload} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--fg-3)" }}>
            Refresh
          </button>
        </div>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--fg-4)", fontSize: 13 }}>
            <ScrollText size={28} style={{ marginBottom: 8 }} /><br />No security events logged yet.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Time", "Event", "User", "IP Address", "Detail"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => {
                  let meta: Record<string, unknown> = {};
                  try { meta = JSON.parse(l.metadataJson); } catch { /* ignore */ }
                  return (
                    <tr key={l.id} style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--fg-4)", whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                          color: EVENT_COLOR[l.eventType] ?? "var(--fg-3)",
                          background: `${EVENT_COLOR[l.eventType] ?? "#888"}18`,
                        }}>{l.eventType.replace(/_/g, " ")}</span>
                      </td>
                      <td style={{ padding: "9px 14px", color: "var(--fg-3)" }}>{l.userId ? `#${l.userId}` : "—"}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-4)" }}>{l.ipAddress ?? "—"}</td>
                      <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--fg-4)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Tab routing ───────────────────────────────────────────────────────────────

  function renderContent() {
    switch (tab) {
      case "overview":       return renderOverview();
      case "authentication": return renderAuthentication();
      case "password":       return renderPasswordPolicy();
      case "mfa":            return renderMFA();
      case "sessions":       return renderSessions();
      case "access":         return renderAccessRules();
      case "data":           return renderDataProtection();
      case "logs":           return renderLogs();
      default:               return null;
    }
  }

  return (
    <div style={{ maxWidth: 1100, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Lock size={18} color="#C8102E" />
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Security Center</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--fg-4)", margin: 0 }}>
          Configure password rules, MFA, session limits, access restrictions and data protection.
          Policies are non-enforcing until integrated — existing login and sessions are unaffected.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, flexWrap: "wrap", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "7px 12px", border: "none",
                borderBottom: active ? "2px solid #C8102E" : "2px solid transparent",
                background: "transparent", cursor: "pointer", fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                color: active ? "#C8102E" : "var(--fg-3)",
                display: "flex", alignItems: "center", gap: 5, marginBottom: -1,
              }}>
              <Icon size={12} strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {renderContent()}

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
