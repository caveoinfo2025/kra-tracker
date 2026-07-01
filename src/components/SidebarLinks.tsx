"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Briefcase, CheckSquare, Receipt,
  Target, Users, Upload, BarChart3, Building2, Smartphone,
  BookUser, Landmark, Banknote, Store, Wallet, MapPin, Layers, Tag,
  ClipboardList, FilePlus, ChevronDown, CheckSquare as Inbox,
  Settings,
} from "lucide-react";
import type { NavigationCapabilities } from "@/lib/access-control/navigation";

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
  // access-control-derived visibility (Step 2J) — see src/lib/access-control/navigation.ts
  nav: NavigationCapabilities;
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
      { href: "/daily-activity", label: "Daily Activity", icon: BarChart3 },
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
      { href: "/kras",                   label: "KRAs",           icon: Target },
      { href: "/performance/my-targets", label: "My KRA Targets", icon: ClipboardList },
      { href: "/import",                 label: "Import",         icon: Upload },
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
      { href: "/daily-activity", label: "Daily Activity", icon: BarChart3 },
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
      { href: "/performance/my-targets", label: "My KRA Targets", icon: ClipboardList },
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
      { href: "/daily-activity", label: "Daily Activity", icon: BarChart3 },
      { href: "/import",        label: "Import",        icon: Upload },
    ],
  },
];

// ─── Finance nav data ──────────────────────────────────────────────────────────

type FinCaps = NavigationCapabilities["finance"];

type FinanceEntry =
  | { kind: "link"; item: NavItem; cap: (f: FinCaps) => boolean }
  | { kind: "group"; group: NavSubGroup; cap: (f: FinCaps) => boolean };

// `cap` decides visibility for users reached via access-control alone (no
// manager/Accounts role). Managers and Accounts always see every entry
// regardless of `cap` — see the `bridge` param on visibleFinanceNav() below.
const FINANCE_FULL_NAV: FinanceEntry[] = [
  { kind: "link", item: { href: "/finance", label: "Dashboard", icon: LayoutDashboard, exact: true },
    cap: (f) => f.canViewFinance },
  {
    kind: "group", group: {
      label: "Accounts", icon: Landmark,
      items: [
        { href: "/finance/cash-book", label: "Cash Book", icon: Banknote },
        { href: "/finance/bank-book", label: "Bank Book", icon: Building2 },
      ],
    },
    cap: (f) => f.canViewPayments,
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
    cap: (f) => f.canViewExpenses,
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
    // Claims/Conveyance ride on expense-style data and have no dedicated
    // catalogue permission (documented gap); Advance has its own. Show this
    // group if either grants access — see RBAC_MIGRATION_TRACKER.md §8.
    cap: (f) => f.canViewExpenses || f.canViewAdvances,
  },
  { kind: "link", item: { href: "/finance/approvals", label: "Finance Approvals", icon: Inbox },
    cap: (f) => f.canApproveFinance },
  // Finance/Voucher has no catalogue permission yet (documented gap) — this
  // item only ever shows via the legacy canManageFinance bridge, never `cap`.
  { kind: "link", item: { href: "/finance/vouchers", label: "Vouchers", icon: FileText },
    cap: () => false },
  // No dedicated Finance/Report permission in the catalogue — unchanged,
  // bridge-only, same as Vouchers.
  { kind: "link", item: { href: "/finance/reports", label: "Reports", icon: BarChart3 },
    cap: () => false },
];

/** Entries a manager/Accounts user always sees (`bridge`), plus anything an
 *  access-control grant additionally unlocks for everyone else. */
function visibleFinanceNav(bridge: boolean, fin: FinCaps): FinanceEntry[] {
  return FINANCE_FULL_NAV.filter((e) => bridge || e.cap(fin));
}

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

function FinanceSectionNav({ isActive, entries }: { isActive: (href: string, exact?: boolean) => boolean; entries: FinanceEntry[] }) {
  const hasActiveChild = entries.some((entry) =>
    entry.kind === "link"
      ? isActive(entry.item.href, entry.item.exact)
      : entry.group.items.some((i) => isActive(i.href, i.exact))
  );

  return (
    <CollapsibleSection label="Finance" hasActiveChild={hasActiveChild}>
      <nav className="sidebar-nav">
        {entries.map((entry, idx) => {
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

/** Masters group items are gated by Masters/CustomerMaster|VendorMaster VIEW
 *  (Step 2J) — unlike the other role-based groups below, which are still the
 *  temporary roles.ts/self-service bridge (§7 of the Step 2J brief: Pipeline,
 *  Daily Updates, KRA, Tasks, Employees are intentionally left untouched). */
function filterMastersItems(items: NavItem[], masters: NavigationCapabilities["masters"]): NavItem[] {
  return items.filter((item) => {
    if (item.href === "/masters/customers") return masters.canViewCustomerMaster;
    if (item.href === "/masters/vendors")   return masters.canViewVendorMaster;
    return true;
  });
}

export default function SidebarLinks({ isManager, isAccounts, showSettings = false, nav }: SidebarLinksProps) {
  const pathname = usePathname();

  // Temporary bridge: Sell/Operate/Me/People groups still use roles/session
  // rules until access-control data scopes fully replace roles.ts (§7 — not
  // migrated this step).
  const groups = isAccounts
    ? ACCOUNTS_GROUPS
    : isManager
    ? MANAGER_GROUPS
    : EMPLOYEE_GROUPS;

  function isActive(href: string, exact = false): boolean {
    if (href === "/" || exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Temporary bridge: existing manager/Accounts users keep full Finance nav
  // regardless of access-control grants, so no current user loses access.
  // `showFullFinance` additionally opens the section for anyone else whose
  // access-control permissions grant at least one Finance capability.
  const financeBridge = isManager || isAccounts;
  const showFullFinance = financeBridge || nav.finance.canViewFinance;
  const financeEntries = visibleFinanceNav(financeBridge, nav.finance);

  // Temporary bridge: roles.ts-computed showSettings (Operations Head / Head
  // of Sales / manager) is preserved alongside the new access-control check,
  // since no role currently holds a Settings/* RolePermission grant in seed
  // data — replacing instead of OR-ing would hide Settings from those users.
  const showSettingsNav = showSettings || nav.settings.canViewSettings;

  return (
    <div className="sidebar-scroll">
      {/* ── Role-based sections ── */}
      {groups.map((group) => {
        const items = group.label === "Masters" ? filterMastersItems(group.items, nav.masters) : group.items;
        if (items.length === 0) return null;
        const hasActiveChild = items.some((item) => isActive(item.href, item.exact));
        return (
          <CollapsibleSection key={group.label} label={group.label} hasActiveChild={hasActiveChild}>
            <nav className="sidebar-nav">
              {items.map((item) => {
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
        ? <FinanceSectionNav isActive={isActive} entries={financeEntries} />
        : <EmployeeFinanceSectionNav isActive={isActive} />
      }

      {/* ── My Workspace (all users) — self-service inbox, always visible ── */}
      <CollapsibleSection label="My Workspace" hasActiveChild={isActive("/approvals")}>
        <nav className="sidebar-nav">
          <Link href="/approvals" className={"nav-link" + (isActive("/approvals") ? " is-active" : "")}>
            <Inbox size={15} className="nav-icon" strokeWidth={1.6} />
            <span>Approvals</span>
          </Link>
        </nav>
      </CollapsibleSection>

      {/* ── Settings ── */}
      {showSettingsNav && (
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
