"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  CheckSquare,
  Receipt,
  Activity,
  Target,
  Users,
  Upload,
  BarChart3,
  Building2,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarLinksProps {
  isManager: boolean;
  isAccounts: boolean;
}

// ─── Nav definitions ──────────────────────────────────────────────────────────

const MANAGER_GROUPS: NavGroup[] = [
  {
    label: "Sell",
    items: [
      { href: "/dashboard",               label: "Dashboard",      icon: LayoutDashboard },
      { href: "/pipeline/leads",          label: "Leads",          icon: FileText },
      { href: "/pipeline/opportunities",  label: "Opportunities",  icon: Briefcase },
      { href: "/pipeline/tasks",          label: "Pipeline Tasks", icon: CheckSquare },
      { href: "/pipeline/analytics",      label: "Analytics",      icon: BarChart3 },
      { href: "/",                        label: "Team Overview",  icon: BarChart3 },
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
      { href: "/dashboard",               label: "Dashboard", icon: LayoutDashboard },
      { href: "/pipeline/leads",          label: "My Leads",  icon: FileText },
      { href: "/pipeline/opportunities",  label: "My Deals",  icon: Briefcase },
      { href: "/pipeline/tasks",          label: "My Tasks",  icon: CheckSquare },
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
    label: "Me",
    items: [
      { href: "/kras", label: "My KRAs", icon: Target },
    ],
  },
];

const ACCOUNTS_GROUPS: NavGroup[] = [
  {
    label: "Finance",
    items: [
      { href: "/accounts",    label: "Payment Tracker", icon: Receipt },
      { href: "/collections", label: "All Collections", icon: Building2 },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SidebarLinks({ isManager, isAccounts }: SidebarLinksProps) {
  const pathname = usePathname();

  const groups = isAccounts
    ? ACCOUNTS_GROUPS
    : isManager
    ? MANAGER_GROUPS
    : EMPLOYEE_GROUPS;

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="sidebar-scroll">
      {groups.map((group) => (
        <div className="sidebar-section" key={group.label}>
          <div className="sidebar-section-label">{group.label}</div>
          <nav className="sidebar-nav">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={"nav-link" + (active ? " is-active" : "")}
                >
                  <Icon size={15} className="nav-icon" strokeWidth={1.6} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* Bottom shortcuts — pushed to bottom via marginTop:auto in flex column */}
      <div className="sidebar-section" style={{ marginTop: "auto", paddingTop: 8 }}>
        <nav className="sidebar-nav">
          <Link
            href="/mobile"
            className={"nav-link" + (isActive("/mobile") ? " is-active" : "")}
          >
            <Smartphone size={15} className="nav-icon" strokeWidth={1.6} />
            <span>Mobile App</span>
          </Link>
          {isManager && (
            <Link
              href="/admin"
              className={"nav-link" + (isActive("/admin") ? " is-active" : "")}
            >
              <ShieldCheck size={15} className="nav-icon" strokeWidth={1.6} />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
