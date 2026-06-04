"use client";
import { Link2 } from "lucide-react";
import { Customer, CustomerCaps, fmtINR } from "../data";

type Kind = "Opportunities" | "Quotations" | "Sales Orders" | "Projects" | "Support" | "AMC" | "Finance" | "Expenses";

interface LinkRow { ref: string; title: string; meta: string; amount?: number; status: string; }

const statusClass = (s: string) =>
  ["Won", "Active", "Paid", "Completed", "Delivered", "Resolved"].includes(s) ? "badge-success"
  : ["Open", "Pending", "In Progress", "Sent"].includes(s) ? "badge-warning"
  : ["Lost", "Overdue", "Breached"].includes(s) ? "badge-danger" : "badge-neutral";

/** Mock linked records per customer — illustrative cross-module references. */
function mockRows(customer: Customer, kind: Kind): LinkRow[] {
  // Only customers with real revenue get rich linked data
  const hasActivity = customer.profitability.revenue > 0;
  const base = customer.customerCode.replace("CUST-", "");
  if (!hasActivity && kind !== "Opportunities") return [];
  switch (kind) {
    case "Opportunities": return [
      { ref: `OPP-${base}01`, title: "Network refresh — core switching", meta: "Created 12 Apr 2026", amount: 1800000, status: customer.status === "Prospect" ? "Open" : "Won" },
      { ref: `OPP-${base}02`, title: "Firewall & security upgrade", meta: "Created 02 May 2026", amount: 950000, status: "Open" },
    ];
    case "Quotations": return [
      { ref: `QTN-${base}11`, title: "Firewall HA pair + 3yr AMC", meta: "Valid till 30 Jun 2026", amount: 1120000, status: "Sent" },
    ];
    case "Sales Orders": return [
      { ref: `SO-${base}21`, title: "Core switching delivery", meta: "PO 18 Apr 2026", amount: customer.profitability.revenue, status: "Delivered" },
    ];
    case "Projects": return [
      { ref: `PRJ-${base}31`, title: "Datacenter network implementation", meta: "Engineer: Rahul Kumar", status: "In Progress" },
    ];
    case "Support": return [
      { ref: `TKT-${base}41`, title: "Firewall throughput degradation", meta: "Priority: High · SLA 4h", status: "Resolved" },
      { ref: `TKT-${base}42`, title: "Switch port failure — stack 2", meta: "Priority: Medium", status: "Open" },
    ];
    case "AMC": return customer.hasActiveAMC ? [
      { ref: `AMC-${base}51`, title: "Annual maintenance — network & security", meta: "01 Apr 2026 → 31 Mar 2027", amount: 480000, status: "Active" },
    ] : [];
    case "Finance": return [
      { ref: `INV-${base}61`, title: "Core switching delivery", meta: "Due 30 May 2026", amount: customer.profitability.revenue, status: "Paid" },
    ];
    case "Expenses": return [
      { ref: `EXP-${base}71`, title: "Engineer site visit — installation", meta: "Conveyance + materials", amount: customer.profitability.engineerTravel, status: "Approved" },
    ];
  }
}

export default function CustomerRelationshipViewer({ customer, kind, caps }: { customer: Customer; kind: Kind; caps: CustomerCaps }) {
  // Finance/Expenses gated to finance-capable roles
  if ((kind === "Finance" || kind === "Expenses") && !caps.canViewFinance) {
    return <div style={{ textAlign: "center", padding: "32px", fontSize: 13, color: "var(--fg-4)" }}>{kind} details are restricted to Finance & Admin roles.</div>;
  }
  const rows = mockRows(customer, kind);
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-4)" }}>
        <Link2 size={24} strokeWidth={1.2} style={{ margin: "0 auto 8px" }} />
        <div style={{ fontSize: 13 }}>No {kind.toLowerCase()} linked to this customer.</div>
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="crm-table">
        <thead>
          <tr>
            <th>Reference</th><th>Details</th>
            {rows.some((r) => r.amount != null) && <th className="th-right">Amount</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ref}>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", whiteSpace: "nowrap" }}>{r.ref}</td>
              <td><div className="cell-strong">{r.title}</div><div className="cell-sub">{r.meta}</div></td>
              {rows.some((x) => x.amount != null) && <td className="td-right" style={{ fontWeight: 600 }}>{r.amount != null ? fmtINR(r.amount) : "—"}</td>}
              <td><span className={`badge ${statusClass(r.status)}`} style={{ fontSize: 10 }}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
