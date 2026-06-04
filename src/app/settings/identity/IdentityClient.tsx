"use client";

import { useState } from "react";
import { Users, Shield, Key, Database, GitMerge, ClipboardList, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import UsersTab            from "./components/UsersTab";
import RoleManagement      from "./components/RoleManagement";
import PermissionMatrix    from "./components/PermissionMatrix";
import DataAccessPolicyPanel from "./components/DataAccessPolicyPanel";
import DelegationPanel     from "./components/DelegationPanel";
import IdentityAudit       from "./components/IdentityAudit";

type TabId = "users" | "roles" | "permissions" | "policies" | "delegation" | "audit";

interface TabDef {
  id:    TabId;
  label: string;
  Icon:  React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
}

const TABS: TabDef[] = [
  { id: "users",       label: "Users",         Icon: Users       },
  { id: "roles",       label: "Roles",         Icon: Shield      },
  { id: "permissions", label: "Permissions",   Icon: Key         },
  { id: "policies",    label: "Data Access",   Icon: Database    },
  { id: "delegation",  label: "Delegation",    Icon: GitMerge    },
  { id: "audit",       label: "Audit",         Icon: ClipboardList },
];

interface Props { canEdit: boolean; }

export default function IdentityClient({ canEdit }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <div style={{ maxWidth: 1200, padding: "28px 32px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/settings" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-4)" }}>
            <ArrowLeft size={12} strokeWidth={2} /> Admin Console
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "rgba(200,16,46,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={19} strokeWidth={1.6} style={{ color: "var(--caveo-red)" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--fg-1)", fontFamily: "var(--font-display)" }}>
                Identity & Access
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-3)", marginTop: 3 }}>
                Users, roles, permissions, data policies and delegation rules
              </p>
            </div>
          </div>
          {!canEdit && (
            <div style={{ padding: "6px 12px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)", fontSize: 11.5, color: "var(--fg-4)", border: "1px solid var(--border)" }}>
              View-only mode
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" as const }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "none", borderBottom: active ? "2px solid var(--caveo-red)" : "2px solid transparent", background: "transparent", fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: "pointer", whiteSpace: "nowrap" as const, transition: "color var(--duration-fast)", marginBottom: -1 }}>
              <Icon size={13} strokeWidth={2} />{label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "users"       && <UsersTab             canEdit={canEdit} />}
        {activeTab === "roles"       && <RoleManagement       canEdit={canEdit} />}
        {activeTab === "permissions" && <PermissionMatrix     canEdit={canEdit} />}
        {activeTab === "policies"    && <DataAccessPolicyPanel canEdit={canEdit} />}
        {activeTab === "delegation"  && <DelegationPanel      canEdit={canEdit} />}
        {activeTab === "audit"       && <IdentityAudit />}
      </div>
    </div>
  );
}
