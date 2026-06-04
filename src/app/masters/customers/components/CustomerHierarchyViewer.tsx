"use client";
import { Building2, GitBranch, ChevronRight } from "lucide-react";
import { Customer, statusBadge, childrenOf } from "../data";

/**
 * CustomerHierarchyViewer — shows the parent group + sibling/child companies tree
 * for the selected customer.
 */
export default function CustomerHierarchyViewer({
  customer, allCustomers, onSelect,
}: {
  customer: Customer;
  allCustomers: Customer[];
  onSelect?: (c: Customer) => void;
}) {
  // Resolve the top-of-tree (the group parent or self)
  const root = customer.parentId
    ? allCustomers.find((c) => c.id === customer.parentId) ?? customer
    : customer;
  const children = childrenOf(allCustomers, root.id);

  if (root.id === customer.id && children.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fg-4)", fontSize: 13 }}>
        This customer is standalone — no group hierarchy configured.
      </div>
    );
  }

  const Node = ({ c, isChild }: { c: Customer; isChild?: boolean }) => {
    const isCurrent = c.id === customer.id;
    return (
      <div
        onClick={() => onSelect?.(c)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderRadius: 10, border: `1px solid ${isCurrent ? "var(--caveo-red)" : "var(--border)"}`,
          background: isCurrent ? "rgba(200,16,46,0.03)" : "var(--surface-alt)",
          cursor: onSelect ? "pointer" : "default", marginLeft: isChild ? 28 : 0,
        }}
      >
        {isChild ? <GitBranch size={15} style={{ color: "var(--fg-4)" }} /> : <Building2 size={16} style={{ color: "var(--caveo-red)" }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--caveo-red)" }}>{c.customerCode}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.legalName}</span>
            {isCurrent && <span className="badge badge-accent" style={{ fontSize: 9 }}>Viewing</span>}
            {!isChild && <span className="badge badge-info" style={{ fontSize: 9 }}>Group Parent</span>}
          </div>
          <div className="cell-sub">{c.customerType} · {c.industry}{isChild && c.relationshipType ? ` · ${c.relationshipType}` : ""}</div>
        </div>
        <span className={`badge ${statusBadge(c.status)}`} style={{ fontSize: 9 }}>{c.status}</span>
        {onSelect && <ChevronRight size={14} style={{ color: "var(--fg-4)" }} />}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Node c={root} />
      {children.map((ch) => <Node key={ch.id} c={ch} isChild />)}
      <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 4 }}>
        {children.length} group {children.length === 1 ? "company" : "companies"} under {root.tradeName}
      </div>
    </div>
  );
}
