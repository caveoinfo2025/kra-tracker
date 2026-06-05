"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Briefcase, CheckSquare, Receipt, Activity,
  Target, Users, Upload, BarChart3, Building2, Smartphone,
  BookUser, Landmark, Banknote, Store, Wallet, MapPin, Layers, Tag,
  ClipboardList, FilePlus, ChevronDown, CheckSquare as Inbox,
  Settings,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  exact?: boolean;
}

interface NavSubGroup {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  items: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarLinksProps {
  isManager: boolean;
  isAccounts: boolean;
  showSettings?: boolean;
}

// ─── Role-based nav groups ─────────────────────────────────────────────────────

const MANAGER_GROUPS: NavGroup[] = [
  {
    label: "Sell",
    items: [
      { href: "/dashboard",              label: "Dashboard",      icon: LayoutDashboard },
      { href: "/pipeline/leads",         label: "Leads",          icon: FileText },
      { href: "/pipeline/opportunities", label: "Opportunities",  icon: Briefcase },
      { href: "/pipeline/tasks",         label: "Pipeline Tasks", icon: CheckSquare },
      { href: "/pipeline/analytics",     label: "Analytics",      icon: BarChart3 },
      { href: "/",                       label: "Team Overview",  icon: BarChart3 },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/collections",   label: "Collections",   icon: Receipt },
      { href: "/daily-updates", label: "Daily Updates", icon: Activity },
    ],
  },
  {
    label: "Masters",
    items: [
      { href: "/masters/customers", label: "Customer Master", icon: BookUser },
      { href: "/masters/vendors",   label: "Vendor Master",   icon: Store },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/kras",      label: "KRAs",   icon: Target },
      { href: "/employees", label: "Team",   icon: Users },
      { href: "/import",    label: "Import", icon: Upload },
    ],
  },
];

const EMPLOYEE_GROUPS: NavGroup[] = [
  {
    label: "Sell",
    items: [
      { href: "/dashboard",              label: "Dashboard", icon: LayoutDashboard },
      { href: "/pipeline/leads",         label: "My Leads",  icon: FileText },
      { href: "/pipeline/opportunities", label: "My Deals",  icon: Briefcase },
      { href: "/pipeline/tasks",         label: "My Tasks",  icon: CheckSquare },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/collections",   label: "Collections",   icon: Receipt },
      { href: "/daily-updates", label: "Daily Updates", icon: Activity },
    ],
  },
  {
    label: "Masters",
    items: [
      { href: "/masters/customers", label: "Customer Master", icon: BookUser },
      { href: "/masters/vendors",   label: "Vendor Master",   icon: Store },
    ],
  },
  {
    label: "Me",
    items: [
      { href: "/kras", label: "My KRAs", icon: Target },
    ],
  },
];

const ACCOUNTS_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard",     icon: LayoutDashboard },
      { href: "/",          label: "Team Overview", icon: BarChart3 },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/accounts",    label: "Payment Tracker", icon: Receipt },
      { href: "/collections", label: "All Collections", icon: Building2 },
    ],
  },
  {
    label: "Masters",
    items: [
      { href: "/masters/customers", label: "Customer Master", icon: BookUser },
      { href: "/masters/vendors",   label: "Vendor Master",   icon: Store },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/daily-updates", label: "Daily Updates", icon: Activity },
      { href: "/import",        label: "Import",        icon: Upload },
    ],
  },
];

// ─── Finance nav data ──────────────────────────────────────────────────────────

type FinanceEntry =
  | { kind: "link"; item: NavItem }
  | { kind: "group"; group: NavSubGroup };

const FINANCE_FULL_NAV: FinanceEntry[] = [
  { kind: "link", item: { href: "/finance", label: "Dashboard", icon: LayoutDashboard, exact: true } },
  {
    kind: "group", group: {
      label: "Accounts", icon: Landmark,
      items: [
        { href: "/finance/cash-book", label: "Cash Book", icon: Banknote },
        { href: "/finance/bank-book", label: "Bank Book", icon: Building2 },
      ],
    },
  },
  {
    kind: "group", group: {
      label: "Expenses", icon: Receipt,
      items: [
        { href: "/finance/expenses",            label: "Expense Register", icon: ClipboardList },
        { href: "/finance/expenses/new",        label: "Add Expense",      icon: FilePlus },
        { href: "/finance/expenses/categories", label: "Categories",       icon: Tag },
      ],
    },
  },
  {
    kind: "group", group: {
      label: "Employees", icon: Users,
      items: [
        { href: "/finance/claims",     label: "Claims",     icon: Layers },
        { href: "/finance/advances",   label: "Advance",    icon: Wallet },
        { href: "/finance/conveyance", label: "Conveyance", icon: MapPin },
      ],
    },
  },
  { kind: "link", item: { href: "/finance/approvals", label: "Approvals", icon: Inbox } },
  { kind: "link", item: { href: "/finance/vouchers",  label: "Vouchers",  icon: FileText } },
  { kind: "link", item: { href: "/finance/reports",   label: "Reports",   icon: BarChart3 } },
];

const EMPLOYEE_FINANCE_ITEMS: NavItem[] = [
  { href: "/finance/expenses",   label: "My Expenses",  icon: Receipt },
  { href: "/finance/claims",     label: "My Claims",    icon: Layers },
  { href: "/finance/advances",   label: "My Advance",   icon: Wallet },
  { href: "/finance/conveyance", label: "Conveyance",   icon: MapPin },
];

// ─── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  label,
  hasActiveChild,
  children,
}: {
  label: string;
  hasActiveChild: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <div className="sidebar-section">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sidebar-section-label"
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", padding: 0, userSelect: "none",
        }}
      >
        <span style={{ padding: "0 8px 6px" }}>{label}</span>
        <ChevronDown
          size={11} strokeWidth={2.5}
          style={{
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform var(--duration-fast) var(--ease-out)",
            opacity: 0.45, flexShrink: 0, marginBottom: 5,
          }}
        />
      </button>
      {open && children}
    </div>
  );
}

// ─── CollapsibleGroup (Finance sub-groups) ────────────────────────────────────

function CollapsibleGroup({
  group,
  isActive,
}: {
  group: NavSubGroup;
  isActive: (href: string, exact?: boolean) => boolean;
}) {
  const hasActiveChild = group.items.some((i) => isActive(i.href, i.exact));
  const [open, setOpen] = useState(hasActiveChild);
  const Icon = group.icon;

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={"nav-link" + (hasActiveChild ? " is-active" : "")}
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={15} className="nav-icon" strokeWidth={1.6} />
          <span>{group.label}</span>
        </span>
        <ChevronDown
          size={12} strokeWidth={2}
          style={{
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform var(--duration-fast) var(--ease-out)",
            opacity: 0.45, flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div style={{ paddingLeft: 8, marginLeft: 17, marginTop: 1, marginBottom: 2, borderLeft: "1.5px solid var(--border)" }}>
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} className={"nav-link" + (active ? " is-active" : "")} style={{ paddingLeft: 8, fontSize: 12.5 }}>
                <ItemIcon size={13} className="nav-icon" strokeWidth={1.6} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Finance section (full) ───────────────────────────────────────────────────

function FinanceSectionNav({ isActive }: { isActive: (href: string, exact?: boolean) => boolean }) {
  const hasActiveChild = FINANCE_FULL_NAV.some((entry) =>
    entry.kind === "link"
      ? isActive(entry.item.href, entry.item.exact)
      : entry.group.items.some((i) => isActive(i.href, i.exact))
  );

  return (
    <CollapsibleSection label="Finance" hasActiveChild={hasActiveChild}>
      <nav className="sidebar-nav">
        {FINANCE_FULL_NAV.map((entry, idx) => {
          if (entry.kind === "link") {
            const Icon = entry.item.icon;
            const active = isActive(entry.item.href, entry.item.exact);
            return (
              <Link key={entry.item.href} href={entry.item.href} className={"nav-link" + (active ? " is-active" : "")}>
                <Icon size={15} className="nav-icon" strokeWidth={1.6} />
                <span>{entry.item.label}</span>
              </Link>
            );
          }
          return (
            <CollapsibleGroup key={entry.group.label + idx} group={entry.group} isActive={isActive} />
          );
        })}
      </nav>
    </CollapsibleSection>
  );
}

// ─── Finance section (limited — own-data employees) ──────────────────────────

function EmployeeFinanceSectionNav({ isActive }: { isActive: (href: string, exact?: boolean) => boolean }) {
  const hasActiveChild = EMPLOYEE_FINANCE_ITEMS.some((i) => isActive(i.href, i.exact));
  return (
    <CollapsibleSection label="Finance" hasActiveChild={hasActiveChild}>
      <nav className="sidebar-nav">
        {EMPLOYEE_FINANCE_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link key={item.href} href={item.href} className={"nav-link" + (active ? " is-active" : "")}>
              <Icon size={15} className="nav-icon" strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </CollapsibleSection>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidebarLinks({ isManager, isAccounts, showSettings = false }: SidebarLinksProps) {
  const pathname = usePathname();

  const groups = isAccounts
    ? ACCOUNTS_GROUPS
    : isManager
    ? MANAGER_GROUPS
    : EMPLOYEE_GROUPS;

  function isActive(href: string, exact = false): boolean {
    if (href === "/" || exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const showFullFinance = isManager || isAccounts;

  return (
    <div className="sidebar-scroll">
      {/* ── Role-based sections ── */}
      {groups.map((group) => {
        const hasActiveChild = group.items.some((item) => isActive(item.href, item.exact));
        return (
          <CollapsibleSection key={group.label} label={group.label} hasActiveChild={hasActiveChild}>
            <nav className="sidebar-nav">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link key={item.href} href={item.href} className={"nav-link" + (active ? " is-active" : "")}>
                    <Icon size={15} className="nav-icon" strokeWidth={1.6} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </CollapsibleSection>
        );
      })}

      {/* ── Finance Operations ── */}
      {showFullFinance
        ? <FinanceSectionNav isActive={isActive} />
        : <EmployeeFinanceSectionNav isActive={isActive} />
      }

      {/* ── My Workspace (all users) ── */}
      <CollapsibleSection label="My Workspace" hasActiveChild={isActive("/approvals")}>
        <nav className="sidebar-nav">
          <Link href="/approvals" className={"nav-link" + (isActive("/approvals") ? " is-active" : "")}>
            <Inbox size={15} className="nav-icon" strokeWidth={1.6} />
            <span>Approvals</span>
          </Link>
        </nav>
      </CollapsibleSection>

      {/* ── Settings ── */}
      {showSettings && (
        <CollapsibleSection label="Settings" hasActiveChild={isActive("/settings")}>
          <nav className="sidebar-nav">
            <Link href="/settings" className={"nav-link" + (isActive("/settings") ? " is-active" : "")}>
              <Settings size={15} className="nav-icon" strokeWidth={1.6} />
              <span>Settings</span>
            </Link>
          </nav>
        </CollapsibleSection>
      )}

      {/* ── Bottom shortcuts ── */}
      <div className="sidebar-section" style={{ marginTop: "auto", paddingTop: 8 }}>
        <nav className="sidebar-nav">
          <Link href="/mobile" className={"nav-link" + (isActive("/mobile") ? " is-active" : "")}>
            <Smartphone size={15} className="nav-icon" strokeWidth={1.6} />
            <span>Mobile App</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
