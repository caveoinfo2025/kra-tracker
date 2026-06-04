"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Building2, GitBranch, Layers, Users, UserCheck } from "lucide-react";
import type { OrgTreeNode } from "../data/organization.types";
import { buildMockTree } from "../data/organization.types";
import type { OrgCompany, OrgBranch, OrgDepartment, OrgTeam } from "../data/organization.types";

interface Props {
  companies:   OrgCompany[];
  branches:    OrgBranch[];
  departments: OrgDepartment[];
  teams:       OrgTeam[];
}

const TYPE_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  company:    Building2,
  branch:     GitBranch,
  department: Layers,
  team:       Users,
};

const TYPE_COLOR: Record<string, string> = {
  company:    "#0066FF",
  branch:     "#1F9D55",
  department: "#FF6B00",
  team:       "#C8102E",
};

const TYPE_LABEL: Record<string, string> = {
  company:    "Company",
  branch:     "Branch",
  department: "Department",
  team:       "Team",
};

function TreeNode({ node, depth = 0 }: { node: OrgTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const Icon = TYPE_ICON[node.type] ?? UserCheck;
  const color = TYPE_COLOR[node.type] ?? "var(--fg-3)";
  const isInactive = node.status === "INACTIVE";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: "var(--radius-sm)",
          cursor: hasChildren ? "pointer" : "default",
          marginLeft: depth * 20,
          opacity: isInactive ? 0.5 : 1,
          transition: "background var(--duration-fast)",
        }}
        onMouseEnter={(e) => hasChildren && (e.currentTarget.style.background = "var(--bg-muted)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => hasChildren && setExpanded((x) => !x)}
      >
        {/* Expand toggle */}
        <div style={{ width: 16, flexShrink: 0, color: "var(--fg-4)" }}>
          {hasChildren
            ? expanded
              ? <ChevronDown size={13} strokeWidth={2} />
              : <ChevronRight size={13} strokeWidth={2} />
            : null}
        </div>

        {/* Icon */}
        <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={13} strokeWidth={1.8} style={{ color }} />
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: depth === 0 ? 700 : 500, color: isInactive ? "var(--fg-4)" : "var(--fg-1)" }}>
            {node.label}
          </span>
          {isInactive && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--fg-4)" }}>(inactive)</span>}
        </div>

        {/* Type pill */}
        <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}18`, padding: "2px 7px", borderRadius: 999, flexShrink: 0 }}>
          {TYPE_LABEL[node.type]}
        </span>

        {/* Count */}
        {node.count !== undefined && node.count > 0 && (
          <span style={{ fontSize: 11, color: "var(--fg-4)", flexShrink: 0 }}>
            {node.count} {node.type === "team" ? "member" : node.type === "branch" ? "employee" : node.type === "department" ? "team" : "branch"}{node.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div style={{ borderLeft: `1.5px solid var(--border-subtle)`, marginLeft: depth * 20 + 26 }}>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrganizationTree({ companies, branches, departments, teams }: Props) {
  const [expandAll, setExpandAll] = useState(false);

  const tree = buildMockTree(companies, branches, departments, teams);

  const tenantNode: OrgTreeNode = {
    id: "tenant-1",
    label: "Caveo Infosystems",
    type: "company",
    status: "ACTIVE",
    children: tree,
  };

  if (companies.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
        <Building2 size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No organization structure yet</div>
        <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>Add companies, branches, and departments first.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Organization Hierarchy</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>
            {companies.length} {companies.length === 1 ? "company" : "companies"} · {branches.filter((b) => b.status === "ACTIVE").length} active branches · {departments.filter((d) => d.status === "ACTIVE").length} departments · {teams.filter((t) => t.status === "ACTIVE").length} teams
          </div>
        </div>
        <button onClick={() => setExpandAll((x) => !x)} style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--fg-3)" }}>
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "10px 14px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
        {Object.entries(TYPE_COLOR).map(([type, color]) => {
          const Icon = TYPE_ICON[type];
          return (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={10} strokeWidth={2} style={{ color }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{TYPE_LABEL[type]}</span>
            </div>
          );
        })}
      </div>

      {/* Tree */}
      <div className="card" style={{ padding: "12px 8px" }} key={expandAll ? "expanded" : "collapsed"}>
        {/* Tenant root */}
        <div style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 8, marginBottom: 4, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(15,17,21,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={13} strokeWidth={1.8} style={{ color: "var(--fg-3)" }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>Caveo Infosystems</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-4)" }}>Tenant · Root</div>
          </div>
        </div>

        {tree.length === 0 ? (
          <div style={{ padding: "20px 10px", fontSize: 12, color: "var(--fg-4)", textAlign: "center" }}>No companies configured</div>
        ) : (
          tree.map((node) => (
            <TreeNode key={node.id} node={node} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
