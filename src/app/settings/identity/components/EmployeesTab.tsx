"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, X, UserCog, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { userStatusBadge, type UserStatus } from "../data/identityDefaults";

interface AssignedRole { id: number; name: string; }
interface AvailableRole { id: number; name: string; description: string | null; isSystemRole: boolean; status: string; }
interface Department   { id: number; name: string; status: string; }
interface Designation  { id: number; title: string; status: string; }
interface ManagerOption { id: number; name: string; role: string; }

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  isManager: boolean;
  msEmail: string | null;
  reportsToId: number | null;
  createdAt: string;
  // Merged-in from /api/admin/identity/users (enterprise profile + RBAC)
  employeeCode?: string;
  employmentStatus: UserStatus;
  assignedRoles: AssignedRole[];
}

const EMPTY_FORM = {
  name: "", email: "", msEmail: "", isManager: false,
  department: "", departmentId: null as number | null,
  role: "",       designationId: null as number | null,
  reportsToId:    null as number | null,
};
const STATUS_OPTIONS: UserStatus[] = ["ACTIVE", "SUSPENDED", "INACTIVE", "DRAFT"];

interface Props { canEdit: boolean; }

export default function EmployeesTab({ canEdit }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [toast, setToast]         = useState("");

  // Drawer state
  const [drawer, setDrawer]       = useState<"add" | "edit" | null>(null);
  const [editing, setEditing]     = useState<Employee | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  // Role assignment state
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [rolesBusy, setRolesBusy]           = useState<number | null>(null); // roleId being toggled

  // Form master-data dropdowns
  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [designations,  setDesignations]  = useState<Designation[]>([]);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Base employee records (editable core fields) + enterprise overlay (status + roles)
      const [empRes, userRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/admin/identity/users"),
      ]);
      const base: Array<Omit<Employee, "employmentStatus" | "assignedRoles" | "employeeCode">> =
        empRes.ok ? await empRes.json() : [];
      const overlay: Array<{ id: number; employeeCode?: string; employmentStatus?: UserStatus; assignedRoles?: AssignedRole[] }> =
        userRes.ok ? await userRes.json() : [];
      const byId = new Map(overlay.map((u) => [u.id, u]));
      setEmployees(base.map((e) => ({
        ...e,
        employeeCode:     byId.get(e.id)?.employeeCode,
        employmentStatus: byId.get(e.id)?.employmentStatus ?? "ACTIVE",
        assignedRoles:    byId.get(e.id)?.assignedRoles ?? [],
      })));
    } catch { /* keep current */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function loadFormMasterData() {
    Promise.all([
      fetch("/api/settings/organization/departments").then((r) => r.ok ? r.json() : []),
      fetch("/api/settings/organization/designations").then((r) => r.ok ? r.json() : []),
      fetch("/api/employees").then((r) => r.ok ? r.json() : []),
    ]).then(([depts, desigs, emps]) => {
      setDepartments((depts as Department[]).filter((d) => d.status === "ACTIVE"));
      setDesignations((desigs as Designation[]).filter((d) => d.status === "ACTIVE"));
      setManagerOptions((emps as ManagerOption[]).map((e) => ({ id: e.id, name: e.name, role: e.role })));
    }).catch(() => {});
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormErr("");
    setEditing(null);
    setDrawer("add");
    loadFormMasterData();
  }

  function openEdit(emp: Employee) {
    setForm({
      name: emp.name, email: emp.email, msEmail: emp.msEmail ?? "", isManager: emp.isManager,
      department: emp.department, departmentId: null,
      role: emp.role,             designationId: null,
      reportsToId: emp.reportsToId ?? null,
    });
    setFormErr("");
    setEditing(emp);
    setDrawer("edit");
    loadFormMasterData();
    // Fetch all available active roles in the background
    fetch("/api/admin/identity/roles")
      .then((r) => r.ok ? r.json() : [])
      .then((roles: AvailableRole[]) => setAvailableRoles(roles.filter((r) => r.status === "ACTIVE")))
      .catch(() => {});
  }

  function closeDrawer() {
    setDrawer(null); setEditing(null); setFormErr("");
    setAvailableRoles([]); setDepartments([]); setDesignations([]); setManagerOptions([]);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      setFormErr("Name and email are required.");
      return;
    }
    if (!form.department && !form.departmentId) {
      setFormErr("Please select a department.");
      return;
    }
    if (!form.role && !form.designationId) {
      setFormErr("Please select a designation / role.");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      const isEdit = drawer === "edit" && editing;
      const url    = isEdit ? `/api/employees/${editing.id}` : "/api/employees";
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          msEmail:       form.msEmail || null,
          departmentId:  form.departmentId  || null,
          designationId: form.designationId || null,
          reportsToId:   form.reportsToId   || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setFormErr(d.error || "Save failed.");
        return;
      }
      flash(isEdit ? `${form.name} updated.` : `${form.name} added.`);
      closeDrawer();
      load();
    } catch { setFormErr("Network error."); }
    finally { setSaving(false); }
  }

  async function handleStatusChange(emp: Employee, newStatus: UserStatus) {
    setStatusBusy(true);
    try {
      const r = await fetch(`/api/admin/identity/users/${emp.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employmentStatus: newStatus }),
      });
      if (!r.ok) { flash("Status update failed."); return; }
      setEmployees((es) => es.map((e) => e.id === emp.id ? { ...e, employmentStatus: newStatus } : e));
      setEditing((e) => e ? { ...e, employmentStatus: newStatus } : e);
      flash(`${emp.name} set to ${newStatus}.`);
    } catch { flash("Network error."); }
    finally { setStatusBusy(false); }
  }

  async function handleRoleToggle(emp: Employee, role: AvailableRole, currentlyAssigned: boolean) {
    setRolesBusy(role.id);
    try {
      const body = currentlyAssigned ? { removeRoleId: role.id } : { addRoleId: role.id };
      const r = await fetch(`/api/admin/identity/users/${emp.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) { flash("Role update failed."); return; }
      const updatedRoles = currentlyAssigned
        ? emp.assignedRoles.filter((ar) => ar.id !== role.id)
        : [...emp.assignedRoles, { id: role.id, name: role.name }];
      setEmployees((es) => es.map((e) => e.id === emp.id ? { ...e, assignedRoles: updatedRoles } : e));
      setEditing((e) => e ? { ...e, assignedRoles: updatedRoles } : e);
      flash(currentlyAssigned ? `Removed "${role.name}" from ${emp.name}.` : `Assigned "${role.name}" to ${emp.name}.`);
    } catch { flash("Network error."); }
    finally { setRolesBusy(null); }
  }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || (e.employeeCode ?? "").toLowerCase().includes(q);
  });

  const managerCount   = employees.filter((e) => e.isManager).length;
  const suspendedCount = employees.filter((e) => e.employmentStatus === "SUSPENDED" || e.employmentStatus === "INACTIVE").length;

  return (
    <div style={{ position: "relative" }}>
      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
        {[
          { label: "Total Employees", value: employees.length,                color: "#0066FF"          },
          { label: "Managers",        value: managerCount,                    color: "var(--caveo-red)" },
          { label: "Staff",           value: employees.length - managerCount, color: "#1F9D55"          },
          { label: "Suspended / Inactive", value: suspendedCount,             color: "#FF6B00"          },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "12px 20px", flex: "1 1 120px", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, code, department…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        {canEdit && (
          <button onClick={openAdd}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--caveo-red)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2.5} /> Add Employee
          </button>
        )}
        <Link href="/employees" target="_blank"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--fg-3)", fontSize: 12, textDecoration: "none" }}>
          <ExternalLink size={12} /> Full Directory
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <UserCog size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No employees found</div>
          {canEdit && <button onClick={openAdd} style={{ marginTop: 10, fontSize: 12, color: "var(--caveo-red)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Add the first employee</button>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                  {["Code", "Name / Email", "Department", "Role / Title", "Type", "Status", "RBAC Roles", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr key={emp.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{emp.employeeCode || `#${emp.id}`}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(200,16,46,0.09)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--caveo-red)", flexShrink: 0 }}>
                          {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--fg-1)" }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)" }}>{emp.department}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)" }}>{emp.role}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: emp.isManager ? "rgba(200,16,46,0.08)" : "var(--bg-muted)", color: emp.isManager ? "var(--caveo-red)" : "var(--fg-3)" }}>
                        {emp.isManager ? "Manager" : "Staff"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span className={`badge ${userStatusBadge(emp.employmentStatus)}`} style={{ fontSize: 10 }}>{emp.employmentStatus}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      {emp.assignedRoles.length > 0
                        ? emp.assignedRoles.map((r) => (
                          <span key={r.id} style={{ fontSize: 10.5, fontWeight: 600, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", padding: "2px 7px", borderRadius: 999, marginRight: 4, whiteSpace: "nowrap" }}>
                            {r.name}
                          </span>
                        ))
                        : <span style={{ fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>No role</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Link href={`/employees/${emp.id}`}
                          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", fontSize: 11, color: "var(--fg-3)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          <ExternalLink size={10} /> View
                        </Link>
                        {canEdit && (
                          <button onClick={() => openEdit(emp)}
                            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Pencil size={10} strokeWidth={2} /> Manage
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--fg-4)" }}>
        {filtered.length} of {employees.length} employee{employees.length !== 1 ? "s" : ""}
      </div>

      {/* Add / Manage Drawer */}
      {drawer && (
        <>
          {/* Backdrop */}
          <div onClick={closeDrawer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 60 }} />
          {/* Panel */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, background: "var(--surface)", boxShadow: "var(--shadow-xl)", zIndex: 61, display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{drawer === "add" ? "Add Employee" : "Manage Employee"}</div>
                {drawer === "edit" && editing && <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>{editing.employeeCode || `#${editing.id}`} · {editing.name}</div>}
              </div>
              <button onClick={closeDrawer} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {formErr && (
                <div style={{ marginBottom: 14, padding: "9px 12px", background: "rgba(200,16,46,0.07)", border: "1px solid rgba(200,16,46,0.25)", borderRadius: "var(--radius-sm)", fontSize: 12.5, color: "var(--danger)" }}>
                  {formErr}
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Employee Record</div>

              {(["name", "email"] as const).map((field) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5, textTransform: "capitalize" }}>
                    {field.charAt(0).toUpperCase() + field.slice(1)} <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={field === "email" ? "john@caveoinfosystems.com" : "John Doe"}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--bg-input, var(--surface))", color: "var(--fg-1)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}

              {/* Department dropdown */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>
                  Department <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  value={form.departmentId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value) || null;
                    const name = departments.find((d) => d.id === id)?.name ?? form.department;
                    setForm((f) => ({ ...f, departmentId: id, department: id ? name : f.department }));
                  }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--bg-input, var(--surface))", color: form.departmentId ? "var(--fg-1)" : "var(--fg-4)", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="">
                    {departments.length === 0 ? "Loading…" : form.department ? `${form.department} (current)` : "Select department"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 3 }}>Manage departments in Settings → Organisation.</div>
              </div>

              {/* Designation / Role dropdown */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>
                  Designation / Role <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  value={form.designationId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value) || null;
                    const title = designations.find((d) => d.id === id)?.title ?? form.role;
                    setForm((f) => ({ ...f, designationId: id, role: id ? title : f.role }));
                  }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--bg-input, var(--surface))", color: form.designationId ? "var(--fg-1)" : "var(--fg-4)", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="">
                    {designations.length === 0 ? "Loading…" : form.role ? `${form.role} (current)` : "Select designation"}
                  </option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 3 }}>Manage designations in Settings → Organisation.</div>
              </div>

              {/* Reports To dropdown */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>
                  Reports To
                </label>
                <select
                  value={form.reportsToId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, reportsToId: Number(e.target.value) || null }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--bg-input, var(--surface))", color: "var(--fg-1)", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="">{managerOptions.length === 0 ? "Loading…" : "— None —"}</option>
                  {managerOptions
                    .filter((m) => !editing || m.id !== editing.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 3 }}>Sets the reporting hierarchy for KRA reviews and visibility.</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>
                  Microsoft / Azure AD Email
                </label>
                <input
                  type="email"
                  value={form.msEmail}
                  onChange={(e) => setForm((f) => ({ ...f, msEmail: e.target.value }))}
                  placeholder="john@caveoinfosystems.com (for SSO login)"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--bg-input, var(--surface))", color: "var(--fg-1)", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>Leave blank if same as email above. Used for Microsoft Entra SSO matching.</div>
              </div>

              <div style={{ marginBottom: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isManager}
                    onChange={(e) => setForm((f) => ({ ...f, isManager: e.target.checked }))}
                    style={{ width: 14, height: 14, accentColor: "var(--caveo-red)" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--fg-2)" }}>Manager</span>
                </label>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4, paddingLeft: 22 }}>Managers can view all employees&apos; data and configure settings.</div>
              </div>

              {/* ── Access governance (edit only) ── */}
              {drawer === "edit" && editing && (
                <div style={{ marginTop: 22, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={12} strokeWidth={2} /> Account &amp; Access
                  </div>

                  {/* Account status */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 8 }}>Account Status</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {STATUS_OPTIONS.map((s) => {
                        const active = editing.employmentStatus === s;
                        return (
                          <button key={s} disabled={!canEdit || active || statusBusy}
                            onClick={() => handleStatusChange(editing, s)}
                            style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: 11.5, fontWeight: active ? 700 : 500, border: `1px solid ${active ? "var(--caveo-red)" : "var(--border)"}`, background: active ? "rgba(200,16,46,0.07)" : "transparent", color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: canEdit && !active && !statusBusy ? "pointer" : "default" }}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 6 }}>Status changes save immediately. Suspended/Inactive users cannot sign in.</div>
                  </div>

                  {/* RBAC Role assignment */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 8 }}>RBAC Roles</div>
                    {availableRoles.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>Loading roles…</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                        {availableRoles.map((role) => {
                          const assigned = editing.assignedRoles.some((ar) => ar.id === role.id);
                          const busy     = rolesBusy === role.id;
                          return (
                            <div key={role.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${assigned ? "rgba(200,16,46,0.3)" : "var(--border)"}`, background: assigned ? "rgba(200,16,46,0.04)" : "transparent" }}>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: assigned ? 700 : 500, color: assigned ? "var(--caveo-red)" : "var(--fg-2)" }}>{role.name}</div>
                                {role.description && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{role.description}</div>}
                              </div>
                              {canEdit && (
                                <button
                                  disabled={busy}
                                  onClick={() => handleRoleToggle(editing, role, assigned)}
                                  style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${assigned ? "var(--caveo-red)" : "var(--border)"}`, background: assigned ? "var(--caveo-red)" : "transparent", color: assigned ? "#fff" : "var(--fg-3)", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, flexShrink: 0 }}>
                                  {busy ? "…" : assigned ? "Remove" : "Assign"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 8 }}>
                      Changes save immediately. Define roles in the <strong>Roles</strong> tab.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: "9px 0", borderRadius: "var(--radius-sm)", border: "none", background: "var(--caveo-red)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : drawer === "add" ? "Add Employee" : "Save Changes"}
              </button>
              <button onClick={closeDrawer} disabled={saving}
                style={{ padding: "9px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
