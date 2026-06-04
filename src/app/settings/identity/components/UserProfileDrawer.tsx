"use client";

import { useState } from "react";
import { X, User, Building2, ShieldCheck, Power, RefreshCw } from "lucide-react";
import type { IdentityUser, UserStatus } from "../data/identityDefaults";
import { MOCK_ROLES, userStatusBadge, fmtDate } from "../data/identityDefaults";

interface Props {
  user:      IdentityUser;
  canEdit:   boolean;
  onClose:   () => void;
  onUpdated: () => void;
}

type Section = "profile" | "org" | "access";

const STATUS_OPTIONS: UserStatus[] = ["ACTIVE", "SUSPENDED", "INACTIVE", "DRAFT"];

export default function UserProfileDrawer({ user, canEdit, onClose, onUpdated }: Props) {
  const [section, setSection]     = useState<Section>("profile");
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState("");
  const [confirmStatus, setConfirmStatus] = useState<UserStatus | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleStatusChange(newStatus: UserStatus) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/identity/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employmentStatus: newStatus }),
      });
      if (!r.ok) { flash("Status update failed."); setSaving(false); return; }
      flash(`Status updated to ${newStatus}.`); setConfirmStatus(null); onUpdated();
    } catch { flash("Network error."); }
    setSaving(false);
  }

  async function handleResetAccess() {
    flash("Access reset link sent (feature pending email integration).");
  }

  const tabs: Array<{ id: Section; label: string; Icon: typeof User }> = [
    { id: "profile", label: "Profile",          Icon: User          },
    { id: "org",     label: "Org Mapping",       Icon: Building2     },
    { id: "access",  label: "Access & Roles",    Icon: ShieldCheck   },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.4)" }} onClick={onClose} />
      <div style={{ position: "relative", width: 480, background: "var(--surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(200,16,46,0.09)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--caveo-red)", flexShrink: 0 }}>
              {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{user.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 1 }}>{user.employeeCode} · {user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`badge ${userStatusBadge(user.employmentStatus)}`} style={{ fontSize: 10 }}>{user.employmentStatus}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}><X size={16} strokeWidth={2} /></button>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {tabs.map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button key={id} onClick={() => setSection(id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 12px", border: "none", borderBottom: active ? "2px solid var(--caveo-red)" : "2px solid transparent", background: "transparent", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: "pointer", marginBottom: -1 }}>
                <Icon size={12} strokeWidth={2} />{label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* ── Profile ── */}
          {section === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Full Name"      value={user.name} />
              <Field label="Email Address"  value={user.email} />
              <Field label="Mobile"         value={user.mobile ?? "—"} />
              <Field label="Employee Code"  value={user.employeeCode} mono />
              <Field label="Legacy Role"    value={user.legacyRole} />
              <Field label="Manager"        value={user.isManager ? "Yes" : "No"} />
              <Field label="Last Login"     value={user.lastLoginAt ? fmtDate(user.lastLoginAt) : "—"} />
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginBottom: 10 }}>Account Status</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s} disabled={!canEdit || user.employmentStatus === s}
                      onClick={() => setConfirmStatus(s)}
                      style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: 11.5, fontWeight: user.employmentStatus === s ? 700 : 500, border: `1px solid ${user.employmentStatus === s ? "var(--caveo-red)" : "var(--border)"}`, background: user.employmentStatus === s ? "rgba(200,16,46,0.07)" : "transparent", color: user.employmentStatus === s ? "var(--caveo-red)" : "var(--fg-3)", cursor: canEdit && user.employmentStatus !== s ? "pointer" : "default" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Org Mapping ── */}
          {section === "org" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Company"          value={user.companyName ?? "—"} />
              <Field label="Branch"           value={user.branchName ?? "—"} />
              <Field label="Department"       value={user.departmentName ?? "—"} />
              <Field label="Team"             value={user.teamName ?? "—"} />
              <Field label="Designation"      value={user.designationTitle ?? "—"} />
              <Field label="Reporting Manager" value={user.reportingManagerName ?? "—"} />
              <div style={{ padding: "10px 14px", background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--fg-3)" }}>
                Org mapping is managed in the <strong>Organization Management</strong> module. Changes here reflect once the EmployeeProfile DB migration is applied.
              </div>
            </div>
          )}

          {/* ── Access & Roles ── */}
          {section === "access" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Login enabled */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>Login Enabled</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 1 }}>User can sign in with their Microsoft account</div>
                </div>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: user.employmentStatus === "ACTIVE" ? "var(--caveo-red)" : "var(--border)", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: user.employmentStatus === "ACTIVE" ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </div>
              </div>

              {/* Assigned roles */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginBottom: 8 }}>Assigned Roles</div>
                {user.assignedRoles.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--fg-4)", fontStyle: "italic" }}>No roles assigned</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {user.assignedRoles.map((r) => {
                      const roleData = MOCK_ROLES.find((x) => x.id === r.id);
                      return (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>{r.name}</div>
                            {roleData && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>Level {roleData.level} · {roleData.permissionCount} permissions</div>}
                          </div>
                          {canEdit && <button style={{ fontSize: 11, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}>Remove</button>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {canEdit && (
                  <div style={{ marginTop: 10, padding: "10px 14px", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", fontSize: 12.5, color: "var(--fg-4)", textAlign: "center", cursor: "pointer" }}>
                    + Add Role — wired after UserRole API is live
                  </div>
                )}
              </div>

              {/* Actions */}
              {canEdit && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmStatus("SUSPENDED")} disabled={user.employmentStatus !== "ACTIVE"}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(200,16,46,0.3)", background: "transparent", fontSize: 12, color: "var(--danger)", cursor: user.employmentStatus === "ACTIVE" ? "pointer" : "default", opacity: user.employmentStatus === "ACTIVE" ? 1 : 0.4 }}>
                    <Power size={11} strokeWidth={2} /> Suspend Account
                  </button>
                  <button onClick={handleResetAccess}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 12, color: "var(--fg-3)", cursor: "pointer" }}>
                    <RefreshCw size={11} strokeWidth={2} /> Reset Access
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm status change */}
        {confirmStatus && (
          <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.5)" }} onClick={() => setConfirmStatus(null)} />
            <div style={{ position: "relative", background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 24, width: 360, boxShadow: "var(--shadow-lg)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>Change Status to {confirmStatus}?</div>
              <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
                {confirmStatus === "SUSPENDED"
                  ? `${user.name}'s access will be blocked immediately. Their data is preserved.`
                  : confirmStatus === "INACTIVE"
                  ? `${user.name} will be marked inactive. This cannot be undone without a manual reactivation.`
                  : `${user.name}'s account will be set to ${confirmStatus}.`}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmStatus(null)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
                <button onClick={() => handleStatusChange(confirmStatus)} disabled={saving}
                  style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-4)", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--fg-1)", fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</div>
    </div>
  );
}
