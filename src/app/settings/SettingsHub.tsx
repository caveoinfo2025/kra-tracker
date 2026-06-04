"use client";

import Link from "next/link";
import {
  Users, Shield, GitBranch, Settings2, Building2,
  BookOpen, Hash, Bell, FileText, ChevronRight,
  Receipt, Landmark, Banknote, Layers, Wallet, MapPin,
  ClipboardCheck, ClipboardList, BarChart3, Target,
  BookUser, Store, CheckSquare, Activity,
} from "lucide-react";

interface Card {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  description: string;
  section: string;
  badge?: string;
}

const CARDS: Card[] = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    href: "/settings/administration",
    icon: Settings2,
    label: "Administration",
    description: "Pipeline config, KRA weights, KRA targets, sales funnel, finance ops, and system settings.",
    section: "General",
  },
  {
    href: "/settings/users-roles",
    icon: Users,
    label: "Users & Roles",
    description: "Define roles, hierarchy levels, and assign access levels to employees.",
    section: "General",
  },
  {
    href: "/settings/users-roles",
    icon: Shield,
    label: "Permissions",
    description: "Configure what each role can view, create, edit, and delete per module.",
    section: "General",
  },

  // ── Workflow ──────────────────────────────────────────────────────────────
  {
    href: "/settings/workflow/approval-engine",
    icon: GitBranch,
    label: "Approval Engine",
    description: "Build multi-level approval workflows for Finance, HR, Sales, Procurement and more.",
    section: "Workflow",
    badge: "Global",
  },
  {
    href: "/approvals",
    icon: ClipboardCheck,
    label: "My Approvals",
    description: "Pending, approved, and rejected requests across all modules. Approve or reject inline.",
    section: "Workflow",
  },

  // ── People ────────────────────────────────────────────────────────────────
  {
    href: "/employees",
    icon: Users,
    label: "Employee Directory",
    description: "Manage employee profiles, reporting lines, and department assignments.",
    section: "People",
  },
  {
    href: "/kras",
    icon: Target,
    label: "KRA Management",
    description: "Review and configure key result areas, targets, scoring bands, and weekly commits.",
    section: "People",
  },
  {
    href: "/daily-updates",
    icon: Activity,
    label: "Daily Updates",
    description: "Team daily status updates — on track, at risk, blocked, or completed.",
    section: "People",
  },

  // ── Masters ───────────────────────────────────────────────────────────────
  {
    href: "/masters/customers",
    icon: BookUser,
    label: "Customer Master",
    description: "Global customer records used across CRM, Finance, Projects, and Support.",
    section: "Masters",
  },
  {
    href: "/masters/vendors",
    icon: Store,
    label: "Vendor Master",
    description: "Supplier and vendor records with GSTIN, bank details, and multi-branch support.",
    section: "Masters",
  },

  // ── Finance Config ────────────────────────────────────────────────────────
  {
    href: "/finance",
    icon: Landmark,
    label: "Finance Dashboard",
    description: "Cash/bank balances, expense totals, advances outstanding, and payment status.",
    section: "Finance",
  },
  {
    href: "/finance/bank-book",
    icon: Building2,
    label: "Bank Book",
    description: "Bank account ledger — view transactions, reconcile entries, and manage bank accounts.",
    section: "Finance",
  },
  {
    href: "/finance/cash-book",
    icon: Banknote,
    label: "Cash Book",
    description: "Petty cash ledger — record receipts, payments, and opening/closing balances.",
    section: "Finance",
  },
  {
    href: "/finance/expenses",
    icon: Receipt,
    label: "Expense Register",
    description: "All company expenses — filter by category, employee, date, and approval status.",
    section: "Finance",
  },
  {
    href: "/finance/expenses/categories",
    icon: Hash,
    label: "Expense Categories",
    description: "Configure categories with GST rules, grade policies, approval thresholds, and Tally mapping.",
    section: "Finance",
    badge: "Config",
  },
  {
    href: "/finance/claims",
    icon: Layers,
    label: "Claims",
    description: "Employee travel and expense claims — submit, review, and process reimbursements.",
    section: "Finance",
  },
  {
    href: "/finance/advances",
    icon: Wallet,
    label: "Advances",
    description: "Salary and project advances — track disbursements, outstanding balances, and recovery.",
    section: "Finance",
  },
  {
    href: "/finance/conveyance",
    icon: MapPin,
    label: "Conveyance",
    description: "Local conveyance claims with GPS-verified distance and per-km reimbursement rates.",
    section: "Finance",
  },
  {
    href: "/finance/vouchers",
    icon: FileText,
    label: "Vouchers",
    description: "Payment, receipt, and journal vouchers with auto-numbered series (CI/YY-YY/xxxxx).",
    section: "Finance",
  },
  {
    href: "/finance/approvals",
    icon: ClipboardList,
    label: "Finance Approvals",
    description: "Filtered approval inbox — Expenses, Advances, Conveyance, and Payments sub-views.",
    section: "Finance",
  },
  {
    href: "/finance/reports",
    icon: BarChart3,
    label: "Finance Reports",
    description: "P&L, cash flow, expense analysis, advance aging, and collection summary reports.",
    section: "Finance",
  },

  // ── CRM & Sales ───────────────────────────────────────────────────────────
  {
    href: "/pipeline/leads",
    icon: BookOpen,
    label: "Leads",
    description: "Sales pipeline leads — stage, source, assigned rep, and linked opportunities.",
    section: "CRM & Sales",
  },
  {
    href: "/pipeline/tasks",
    icon: CheckSquare,
    label: "Pipeline Tasks",
    description: "All CRM tasks across leads and opportunities — due today, overdue, and upcoming.",
    section: "CRM & Sales",
  },
  {
    href: "/collections",
    icon: Receipt,
    label: "Collections",
    description: "Invoice collection tracker — overdue, partial, and pending payment follow-ups.",
    section: "CRM & Sales",
  },

  // ── System ────────────────────────────────────────────────────────────────
  {
    href: "/settings/administration",
    icon: Bell,
    label: "Notifications",
    description: "Email and mobile push notification preferences (System tab in Administration).",
    section: "System",
  },
  {
    href: "/settings/administration",
    icon: FileText,
    label: "Number Series",
    description: "Voucher number formats and sequence reset rules (System tab in Administration).",
    section: "System",
  },
];

const SECTIONS = [...new Set(CARDS.map((c) => c.section))];

export default function SettingsHub() {
  return (
    <div style={{ maxWidth: 1100, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--fg-1)", margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--fg-4)", marginTop: 6 }}>
          Configure system-wide rules, roles, workflows, and master data.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const cards = CARDS.filter((c) => c.section === section);
        return (
          <div key={section} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-4)", marginBottom: 12 }}>
              {section}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href + card.label} href={card.href} style={{ textDecoration: "none" }}>
                    <div className="card" style={{
                      padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14,
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--caveo-red)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 9, background: "rgba(200,16,46,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon size={18} strokeWidth={1.6} style={{ color: "var(--caveo-red)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1)" }}>{card.label}</span>
                          {card.badge && (
                            <span className="badge badge-info" style={{ fontSize: 10 }}>{card.badge}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>{card.description}</div>
                      </div>
                      <ChevronRight size={14} style={{ color: "var(--fg-4)", flexShrink: 0, marginTop: 2 }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
