"use client";
import { useState } from "react";
import { Receipt, ShoppingCart, Package, FolderKanban, Headphones, Link2 } from "lucide-react";
import { Vendor, VendorCaps } from "../data";

type UsageTab = "Finance" | "Procurement" | "Inventory" | "Projects" | "Support";

const USAGE_TABS: { key: UsageTab; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { key: "Finance", icon: Receipt },
  { key: "Procurement", icon: ShoppingCart },
  { key: "Inventory", icon: Package },
  { key: "Projects", icon: FolderKanban },
  { key: "Support", icon: Headphones },
];

// Mock usage data
const MOCK_FINANCE = [
  { ref: "EXP/26-27/0001", type: "Expense", desc: "Pantry & supplies", amount: "₹4,956", date: "01 Jun 2026", status: "Paid" },
  { ref: "EXP/26-27/0005", type: "Expense", desc: "AMC renewal Q1", amount: "₹88,500", date: "04 Jun 2026", status: "Pending" },
];
const MOCK_PROCUREMENT = [
  { ref: "PO-2026-0011", type: "Purchase Order", desc: "Network switch x2", amount: "₹1,20,000", date: "15 May 2026", status: "Delivered" },
  { ref: "PO-2026-0018", type: "Purchase Order", desc: "Firewall license", amount: "₹80,000", date: "01 Jun 2026", status: "Open" },
];

function EmptyUsage({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-4)" }}>
      <Link2 size={24} strokeWidth={1.2} style={{ margin: "0 auto 8px" }} />
      <div style={{ fontSize: 13 }}>No {label} records linked to this vendor.</div>
      <div style={{ fontSize: 11.5, marginTop: 4 }}>Transactions will appear here once linked.</div>
    </div>
  );
}

function UsageTable({ rows }: { rows: { ref: string; type: string; desc: string; amount: string; date: string; status: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="crm-table">
        <thead>
          <tr>
            <th>Reference</th><th>Type</th><th>Description</th>
            <th className="th-right">Amount</th><th>Date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ref}>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)" }}>{r.ref}</td>
              <td><span className="badge badge-neutral" style={{ fontSize: 10 }}>{r.type}</span></td>
              <td className="cell-sub">{r.desc}</td>
              <td className="td-right" style={{ fontWeight: 600 }}>{r.amount}</td>
              <td className="cell-sub">{r.date}</td>
              <td><span className={`badge ${r.status === "Paid" || r.status === "Delivered" ? "badge-success" : r.status === "Pending" || r.status === "Open" ? "badge-warning" : "badge-neutral"}`} style={{ fontSize: 10 }}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VendorUsageViewer({ vendor, caps }: { vendor: Vendor; caps: VendorCaps }) {
  const [tab, setTab] = useState<UsageTab>("Finance");
  const isFinanceVendor = vendor.businessCategory !== "Courier & Logistics" && vendor.vendorType !== "Contractor";

  const content: Record<UsageTab, React.ReactNode> = {
    Finance: caps.canViewFinance
      ? (isFinanceVendor ? <UsageTable rows={MOCK_FINANCE} /> : <EmptyUsage label="finance" />)
      : <div style={{ textAlign: "center", padding: "32px", fontSize: 13, color: "var(--fg-4)" }}>Finance details are restricted to Accounts roles.</div>,
    Procurement: <UsageTable rows={MOCK_PROCUREMENT} />,
    Inventory: <EmptyUsage label="inventory" />,
    Projects: <EmptyUsage label="project" />,
    Support: <EmptyUsage label="support" />,
  };

  return (
    <div>
      {/* Usage tabs */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {USAGE_TABS.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: tab === key ? 600 : 400, color: tab === key ? "var(--caveo-red)" : "var(--fg-3)", borderBottom: `2px solid ${tab === key ? "var(--caveo-red)" : "transparent"}`, marginBottom: -1, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            <Icon size={13} strokeWidth={1.6} />{key}
          </button>
        ))}
      </div>
      {content[tab]}
    </div>
  );
}
