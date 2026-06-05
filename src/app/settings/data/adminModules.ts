import type { ComponentType, CSSProperties } from "react";
import {
  Building2,
  ShieldCheck,
  Briefcase,
  GitBranch,
  Database,
  Landmark,
  Target,
  Bell,
  BarChart3,
  Globe,
  Lock,
  ClipboardList,
  ScrollText,
} from "lucide-react";

export type ModuleStatus = "active" | "beta" | "coming-soon";

export interface AdminModule {
  id: number;
  name: string;
  description: string;
  route: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; style?: CSSProperties }>;
  status: ModuleStatus;
  ownerRole: string;
  iconColor: string;
  iconBg: string;
}

export interface AdminStat {
  label: string;
  value: number | string;
  sub: string;
  accentColor: string;
}

export interface RecentChange {
  id: number;
  message: string;
  module: string;
  actor: string;
  timeAgo: string;
  type: "role" | "workflow" | "policy" | "setting";
}

// ── Color palettes ────────────────────────────────────────────────────────────
const RED   = { iconColor: "#C8102E", iconBg: "rgba(200,16,46,0.09)"  };
const BLUE  = { iconColor: "#0066FF", iconBg: "rgba(0,102,255,0.09)"  };
const GREEN = { iconColor: "#1F9D55", iconBg: "rgba(31,157,85,0.09)"  };
const AMBER = { iconColor: "#FF6B00", iconBg: "rgba(255,107,0,0.09)"  };

// ── 12 Admin Modules ──────────────────────────────────────────────────────────
export const ADMIN_MODULES: AdminModule[] = [
  {
    id: 1,
    name: "Organization Management",
    description: "Companies, branches, departments, teams and hierarchy",
    route: "/settings/organization",
    icon: Building2,
    status: "active",
    ownerRole: "Super Admin",
    ...BLUE,
  },
  {
    id: 2,
    name: "Identity & Access",
    description: "Users, roles, permissions and access policies",
    route: "/settings/identity",
    icon: ShieldCheck,
    status: "active",
    ownerRole: "Super Admin",
    ...RED,
  },
  {
    id: 3,
    name: "CRM Administration",
    description: "Pipeline, territory, assignment and automation",
    route: "/settings/crm",
    icon: Briefcase,
    status: "active",
    ownerRole: "Sales Head / Ops Head",
    ...AMBER,
  },
  {
    id: 4,
    name: "Workflow Center",
    description: "Approvals, rules, escalation and delegation",
    route: "/settings/workflow",
    icon: GitBranch,
    status: "beta",
    ownerRole: "Ops Head",
    ...AMBER,
  },
  {
    id: 5,
    name: "Master Data Management",
    description: "Global masters and overrides",
    route: "/settings/masters",
    icon: Database,
    status: "active",
    ownerRole: "Ops Head / Accounts",
    ...BLUE,
  },
  {
    id: 6,
    name: "Finance Administration",
    description: "Expense, credit and finance policies",
    route: "/settings/finance",
    icon: Landmark,
    status: "beta",
    ownerRole: "Accounts Admin",
    ...GREEN,
  },
  {
    id: 7,
    name: "Performance Management",
    description: "KRA, KPI and targets",
    route: "/settings/performance",
    icon: Target,
    status: "active",
    ownerRole: "HR / Manager",
    ...AMBER,
  },
  {
    id: 8,
    name: "Communication Center",
    description: "Events, templates and notifications",
    route: "/settings/communication",
    icon: Bell,
    status: "coming-soon",
    ownerRole: "Ops Head",
    ...BLUE,
  },
  {
    id: 9,
    name: "Analytics Administration",
    description: "Dashboards, reports and metrics",
    route: "/settings/analytics",
    icon: BarChart3,
    status: "coming-soon",
    ownerRole: "Manager+",
    ...BLUE,
  },
  {
    id: 10,
    name: "Integration Center",
    description: "Email, GST, APIs and connectors",
    route: "/settings/integrations",
    icon: Globe,
    status: "coming-soon",
    ownerRole: "Super Admin",
    ...BLUE,
  },
  {
    id: 11,
    name: "Security Center",
    description: "Authentication and security policies",
    route: "/settings/security",
    icon: Lock,
    status: "coming-soon",
    ownerRole: "Super Admin",
    ...RED,
  },
  {
    id: 12,
    name: "Governance & Audit",
    description: "Audit, logs and configuration changes",
    route: "/settings/governance",
    icon: ClipboardList,
    status: "coming-soon",
    ownerRole: "Super Admin / Audit",
    ...GREEN,
  },
  {
    id: 13,
    name: "Policy Engine",
    description: "Business rules, approval thresholds and automated policy enforcement",
    route: "/settings/policies",
    icon: ScrollText,
    status: "active",
    ownerRole: "Super Admin / Ops Head",
    ...RED,
  },
];

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  active:       "Active",
  beta:         "Beta",
  "coming-soon": "Planned",
};

export const STATUS_BADGE: Record<ModuleStatus, string> = {
  active:       "badge-success",
  beta:         "badge-warning",
  "coming-soon": "badge-neutral",
};

// ── Quick stats (Phase 1: placeholder values) ─────────────────────────────────
export const ADMIN_STATS: AdminStat[] = [
  { label: "Active Users",          value: 7,  sub: "employees",           accentColor: "#0066FF" },
  { label: "Pending Approvals",     value: 0,  sub: "awaiting action",     accentColor: "#FF6B00" },
  { label: "Active Workflows",      value: 2,  sub: "configured",          accentColor: "#1F9D55" },
  { label: "Configuration Changes", value: 0,  sub: "this month",          accentColor: "#C8102E" },
];

// ── Recent changes (Phase 1: mock data) ───────────────────────────────────────
export const RECENT_CHANGES: RecentChange[] = [
  {
    id: 1,
    message: "Role permission updated",
    module: "Identity & Access",
    actor: "Vijesh Vijayan",
    timeAgo: "2 days ago",
    type: "role",
  },
  {
    id: 2,
    message: "Approval workflow modified",
    module: "Workflow Center",
    actor: "Deepak Sharma",
    timeAgo: "3 days ago",
    type: "workflow",
  },
  {
    id: 3,
    message: "Finance policy changed",
    module: "Finance Administration",
    actor: "Priyadharshini R",
    timeAgo: "5 days ago",
    type: "policy",
  },
];
