"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Users, Target, DollarSign, ChevronRight,
  CheckSquare, Trophy, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high";

export type DashTask = {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  lead?: { id: number; title: string; companyName: string } | null;
  opportunity?: { id: number; stage: string } | null;
  assignedTo?: { id: number; name: string };
};

type KraSummary = {
  id: number;
  title: string;
  weight: number;
  reviews: { progress: number; score: number }[];
};

type Collection = {
  id: number;
  customerName: string;
  dueDate: string;
  invoiceValueLakhs: number;
  amountReceivedLakhs: number;
};

type TeamMember = {
  id: number;
  name: string;
  today: number;
  overdue: number;
  inProgress: number;
};

type TeamKra = {
  id: number;
  name: string;
  avgProgress: number;
  kraCount: number;
};

type TeamPipeline = {
  id: number;
  name: string;
  pipeline: number;
  won: number;
};

type PendingCert = {
  id: number;
  certName: string;
  issuingBody: string;
  dateObtained: string;
  employee: { name: string };
  kra: { title: string };
};

type WeeklyCommit = {
  id: number;
  commitText: string;
  kra: { id: number; title: string };
};

type RecentWin = {
  companyName: string;
  value: number;
  isLegacy?: boolean;
  opportunityName?: string;
};

export type DashboardProps = {
  isManager: boolean;
  employeeName: string;
  currentWeek: number;
  currentYear: number;
  hour: number;
  todayTasks: DashTask[];
  overdueTasks: DashTask[];
  upcomingTasks: DashTask[];
  overdueCollections: Collection[];
  upcomingCollections: Collection[];
  leadStageCounts: Record<string, number>;
  pipelineValue: number;
  wonValue: number;
  totalLeads: number;
  totalOpps: number;
  myKras: KraSummary[];
  weeklyCommits: WeeklyCommit[];
  recentWins: RecentWin[];
  legacyWins: RecentWin[];
  teamTaskHealth: TeamMember[];
  teamKra: TeamKra[];
  teamPipeline: TeamPipeline[];
  pendingCerts: PendingCert[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STAGE_ORDER = [
  "NEW_LEAD", "CONTACTED", "QUALIFIED", "DEMO_SCHEDULED",
  "PROPOSAL_SENT", "NEGOTIATION", "CLOSED",
];
const LEAD_STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead", CONTACTED: "Contacted", QUALIFIED: "Qualified",
  DEMO_SCHEDULED: "Demo Scheduled", PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation", CLOSED: "Closed",
};
const STAGE_COLORS = [
  "#9AA3AD", "#5B626C", "#0066FF", "#FF6B00",
  "#C8102E", "#8E0A1F", "#1F9D55",
];
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; cls: string }> = {
  high:   { label: "High",   cls: "badge-danger" },
  medium: { label: "Med",    cls: "badge-warning" },
  low:    { label: "Low",    cls: "badge-neutral" },
};

function fmt(lakhs: number): string {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}Cr`;
  if (lakhs >= 1)   return `₹${lakhs.toFixed(1)}L`;
  return `₹${(lakhs * 100).toFixed(0)}K`;
}
function fmtShort(lakhs: number): string {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(1)}Cr`;
  return `${lakhs.toFixed(1)}L`;
}
function relDate(iso: string): string {
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `in ${diff}d`;
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase() ?? "").join("");
}
function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── SVG Chart Components ─────────────────────────────────────────────────────

/** Vertical bar chart */
function BarChart({ bars, height = 120 }: {
  bars: { label: string; value: number; color?: string; secondValue?: number; secondColor?: string }[];
  height?: number;
}) {
  const maxVal = Math.max(...bars.map(b => Math.max(b.value, b.secondValue ?? 0)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: height + 24, paddingBottom: 20, position: "relative" }}>
      {bars.map((b, i) => {
        const pct = (b.value / maxVal) * 100;
        const pct2 = b.secondValue != null ? (b.secondValue / maxVal) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 1, width: "100%", height: `${height}px` }}>
              <div style={{
                flex: 1, height: `${pct}%`, background: b.color ?? "var(--caveo-red)",
                borderRadius: "3px 3px 0 0", minHeight: pct > 0 ? 3 : 0,
                transition: "height 0.5s var(--ease-out)",
              }} title={`${b.label}: ${fmtShort(b.value)}`} />
              {b.secondValue != null && (
                <div style={{
                  flex: 1, height: `${pct2}%`, background: b.secondColor ?? "var(--infra-blue)",
                  borderRadius: "3px 3px 0 0", minHeight: pct2 > 0 ? 3 : 0,
                  transition: "height 0.5s var(--ease-out)",
                }} title={`${b.label}: ${fmtShort(b.secondValue)}`} />
              )}
            </div>
            <span style={{ fontSize: 9, color: "var(--fg-4)", textAlign: "center", lineHeight: 1.2, marginTop: 4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal funnel bar */
function FunnelBar({ label, count, max, color, total }: {
  label: string; count: number; max: number; color: string; total: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const sharePct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <div style={{ width: 100, fontSize: 11.5, color: "var(--fg-2)", fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 10, background: "var(--bg-muted)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color, borderRadius: 5,
          transition: "width 0.6s var(--ease-out)",
        }} />
      </div>
      <div style={{ width: 28, fontSize: 11.5, color: "var(--fg-1)", fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{count}</div>
      <div style={{ width: 34, fontSize: 10.5, color: "var(--fg-4)", textAlign: "right", flexShrink: 0 }}>{sharePct}%</div>
    </div>
  );
}

/** SVG Donut chart */
function DonutChart({ slices, size = 110, strokeW = 18 }: {
  slices: { value: number; color: string; label: string }[];
  size?: number; strokeW?: number;
}) {
  const total = slices.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-muted)" strokeWidth={strokeW} fill="none" />
      {slices.map((sl, i) => {
        const frac = sl.value / total;
        const dashArray = `${c * frac} ${c - c * frac}`;
        const dashOffset = -c * (acc / total);
        acc += sl.value;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r}
            stroke={sl.color} strokeWidth={strokeW} fill="none"
            strokeDasharray={dashArray} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 0.5s var(--ease-out)" }}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 3} textAnchor="middle"
        fontFamily="var(--font-display)" fontSize="16" fontWeight="700" fill="var(--fg-1)">
        {slices.reduce((s, sl) => s + sl.value, 0)}
      </text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle"
        fontSize="9" fill="var(--fg-4)" letterSpacing="0.08em">
        LEADS
      </text>
    </svg>
  );
}

/** Progress bar */
function ProgressBar({ value, color = "var(--caveo-red)" }: { value: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ height: 6, background: "var(--bg-muted)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s var(--ease-out)" }} />
    </div>
  );
}

/** Sparkline SVG */
function Sparkline({ data, color = "var(--caveo-red)" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const w = 80; const h = 28;
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 6) - 3] as [number, number]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: 80, height: h }}>
      <path d={area} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label, value, unit, delta, deltaDir = "up", sub, spark, sparkColor, accent,
}: {
  label: string; value: string | number; unit?: string;
  delta?: string; deltaDir?: "up" | "down"; sub?: string;
  spark?: number[]; sparkColor?: string; accent?: boolean;
}) {
  return (
    <div className={"kpi" + (accent ? " kpi-accent" : "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}{unit && <span className="unit"> {unit}</span>}
      </div>
      {(delta || spark) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {delta && (
            <div className={`kpi-delta ${deltaDir}`}>
              {deltaDir === "up"
                ? <TrendingUp size={11} />
                : <TrendingDown size={11} />}
              {delta}
              {sub && <span className="vs">{sub}</span>}
            </div>
          )}
          {spark && <Sparkline data={spark} color={sparkColor ?? "var(--caveo-red)"} />}
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, onStatusChange, busyId, showAssignee = false,
}: {
  task: DashTask;
  onStatusChange: (id: number, s: TaskStatus) => void;
  busyId: number | null;
  showAssignee?: boolean;
}) {
  const overdue = new Date(task.dueDate) < new Date() && task.status !== "completed";
  const cfg = PRIORITY_CONFIG[task.priority];
  const busy = busyId === task.id;

  return (
    <div style={{
      background: "var(--bg-elev)",
      border: `1px solid ${overdue ? "var(--caveo-red-50)" : "var(--border)"}`,
      borderLeft: overdue ? "3px solid var(--caveo-red)" : "3px solid transparent",
      borderRadius: 10,
      padding: "10px 14px",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{task.title}</span>
          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
          {overdue && <span className="badge badge-danger">Overdue</span>}
        </div>
        {task.lead && (
          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
            {task.lead.companyName}
            {showAssignee && task.assignedTo && ` · ${task.assignedTo.name}`}
          </div>
        )}
        <div style={{ fontSize: 11, color: overdue ? "var(--caveo-red)" : "var(--fg-4)", marginTop: 3 }}>
          {relDate(task.dueDate)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {task.status === "pending" && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onStatusChange(task.id, "in_progress")}
            disabled={busy}
            style={{ fontSize: 11 }}
          >Start</button>
        )}
        {(task.status === "pending" || task.status === "in_progress") && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onStatusChange(task.id, "completed")}
            disabled={busy}
            style={{ fontSize: 11 }}
          >Done</button>
        )}
        {task.status === "in_progress" && (
          <span className="badge badge-warning" style={{ alignSelf: "center", fontSize: 10 }}>In Progress</span>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function CardHeader({
  title, sub, href, hrefLabel = "View all",
}: { title: string; sub?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="card-header">
      <div>
        <div className="ch-title">{title}</div>
        {sub && <div className="ch-sub">{sub}</div>}
      </div>
      {href && (
        <Link href={href} className="btn btn-ghost btn-sm" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
          {hrefLabel} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const hues = [340, 28, 215, 165, 270, 195, 12, 50];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `hsl(${hue}, 25%, 28%)`,
      color: "#fff", fontSize: size * 0.38, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      letterSpacing: 0.5,
    }}>
      {initials(name)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient(props: DashboardProps) {
  const {
    isManager, employeeName, hour,
    overdueCollections, upcomingCollections,
    leadStageCounts, pipelineValue, wonValue, totalLeads, totalOpps,
    myKras, weeklyCommits, recentWins, legacyWins,
    teamTaskHealth, teamKra, teamPipeline, pendingCerts,
    currentWeek, currentYear,
  } = props;

  const [allTasks, setAllTasks] = useState<DashTask[]>([
    ...props.todayTasks,
    ...props.overdueTasks,
    ...props.upcomingTasks,
  ]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const activeTodayTasks = useMemo(() =>
    allTasks.filter(t => {
      if (["completed", "cancelled"].includes(t.status)) return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }), [allTasks, today]);

  const activeOverdueTasks = useMemo(() =>
    allTasks.filter(t => {
      if (["completed", "cancelled"].includes(t.status)) return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    }), [allTasks, today]);

  const activeUpcomingTasks = useMemo(() =>
    allTasks.filter(t => {
      if (["completed", "cancelled"].includes(t.status)) return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d.getTime() > today.getTime();
    }), [allTasks, today]);

  // Search filter
  const q = search.toLowerCase();
  const filteredTasks = useMemo(() =>
    allTasks.filter(t =>
      !q || t.title.toLowerCase().includes(q) ||
      t.lead?.companyName.toLowerCase().includes(q) ||
      t.assignedTo?.name.toLowerCase().includes(q)
    ), [allTasks, q]);
  const filteredColls = useMemo(() =>
    overdueCollections.filter(c => !q || c.customerName.toLowerCase().includes(q)),
    [overdueCollections, q]);

  const handleStatusChange = useCallback(async (taskId: number, newStatus: TaskStatus) => {
    const snapshot = allTasks.slice();
    setBusyId(taskId);
    setAllTasks(cur => cur.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      const res = await fetch(`/api/pipeline/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setAllTasks(snapshot);
    } finally {
      setBusyId(null);
    }
  }, [allTasks]);

  // ── Lead funnel data ──────────────────────────────────────────────────────
  const funnelStages = LEAD_STAGE_ORDER.map((stage, i) => ({
    stage, label: LEAD_STAGE_LABELS[stage] ?? stage,
    count: leadStageCounts[stage] ?? 0,
    color: STAGE_COLORS[i],
  })).filter(s => s.count > 0);
  const maxCount = Math.max(...funnelStages.map(s => s.count), 1);
  const totalFunnel = funnelStages.reduce((s, f) => s + f.count, 0);

  // ── Donut slices from funnel ───────────────────────────────────────────────
  const donutSlices = funnelStages.map(s => ({ value: s.count, color: s.color, label: s.label }));

  // ── Team bar chart data ───────────────────────────────────────────────────
  const teamBars = teamPipeline
    .filter(t => t.pipeline > 0 || t.won > 0)
    .sort((a, b) => (b.pipeline + b.won) - (a.pipeline + a.won))
    .slice(0, 8)
    .map(t => ({
      label: t.name,
      value: t.pipeline,
      color: "var(--infra-blue)",
      secondValue: t.won,
      secondColor: "var(--success)",
    }));

  // ── Overdue collection total ───────────────────────────────────────────────
  const overdueCollTotal = overdueCollections.reduce(
    (s, c) => s + (c.invoiceValueLakhs - c.amountReceivedLakhs), 0
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MANAGER DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  if (isManager) {
    const completedToday = allTasks.filter(t => {
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return t.status === "completed" && d.getTime() === today.getTime();
    }).length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="page-eyebrow">Week {currentWeek} · {currentYear}</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, margin: 0, color: "var(--fg-1)" }}>
              {greeting(hour)}, {employeeName.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4, marginBottom: 0 }}>
              {totalFunnel} active leads · ₹{fmtShort(pipelineValue)} pipeline · {activeOverdueTasks.length > 0 && <span style={{ color: "var(--caveo-red)", fontWeight: 600 }}>{activeOverdueTasks.length} overdue tasks</span>}
            </p>
          </div>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", minWidth: 240 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks, leads, teams…"
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--fg-1)", fontFamily: "var(--font-sans)", width: 200 }}
            />
          </div>
        </div>

        {/* ── KPI Strip ───────────────────────────────────────────────────── */}
        <div className="kpi-grid">
          <KpiTile
            label="Tasks Due Today" value={activeTodayTasks.length}
            sub={`${completedToday} done`}
            delta={completedToday > 0 ? `+${completedToday} done` : undefined} deltaDir="up"
            spark={[2,3,4,3,5,4,activeTodayTasks.length]} sparkColor="var(--infra-blue)"
          />
          <KpiTile
            label="Overdue Tasks" value={activeOverdueTasks.length}
            delta={activeOverdueTasks.length > 0 ? `${activeOverdueTasks.length} pending` : "All clear"} deltaDir="down"
            spark={[1,2,2,3,3,2,activeOverdueTasks.length]} sparkColor="var(--caveo-red)"
          />
          <KpiTile
            label="Active Pipeline" value={fmtShort(pipelineValue)}
            delta={`${totalOpps} deals`} deltaDir="up"
            spark={[8,10,12,9,11,13,pipelineValue/100]} sparkColor="var(--ot-orange)"
            accent
          />
          <KpiTile
            label="Closed Won (CRM)" value={fmtShort(wonValue)}
            delta={`${totalOpps > 0 ? Math.round(wonValue/(wonValue+pipelineValue)*100) : 0}% rate`} deltaDir="up"
            spark={[10,15,20,18,22,wonValue/10,wonValue/5]} sparkColor="var(--success)"
          />
          <KpiTile
            label="Overdue Collections" value={overdueCollections.length}
            sub={`₹${fmtShort(overdueCollTotal)} o/s`}
            delta={overdueCollections.length > 0 ? `₹${fmtShort(overdueCollTotal)}` : "Clear"} deltaDir={overdueCollections.length > 0 ? "down" : "up"}
            spark={[5,6,8,9,overdueCollections.length+5,overdueCollections.length+3,overdueCollections.length]} sparkColor="var(--caveo-red)"
          />
        </div>

        {/* ── Funnel + Donut ───────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Sales Funnel */}
          <div className="card">
            <CardHeader title="Sales Funnel" sub={`${totalFunnel} leads by stage`} href="/pipeline/leads" hrefLabel="View pipeline" />
            <div className="card-body">
              {funnelStages.length === 0 ? (
                <p style={{ color: "var(--fg-4)", fontSize: 13 }}>No leads yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {funnelStages.map(s => (
                    <FunnelBar key={s.stage} label={s.label} count={s.count} max={maxCount} color={s.color} total={totalFunnel} />
                  ))}
                </div>
              )}
              {/* Stage colour legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
                {funnelStages.map(s => (
                  <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--fg-3)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline by Stage (Donut) */}
          <div className="card">
            <CardHeader title="Pipeline by Stage" sub="Lead distribution" />
            <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              {donutSlices.length > 0 ? (
                <>
                  <DonutChart slices={donutSlices} size={120} strokeW={18} />
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
                    {donutSlices.map(sl => (
                      <div key={sl.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: sl.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: "var(--fg-2)" }}>{sl.label}</span>
                        <span style={{ fontWeight: 600, color: "var(--fg-1)" }}>{sl.value}</span>
                        <span style={{ color: "var(--fg-4)", width: 32, textAlign: "right" }}>
                          {((sl.value / totalFunnel) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--fg-4)", fontSize: 13 }}>No stage data</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Team Pipeline Bar Chart + Team KRA ──────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Team pipeline bar chart */}
          <div className="card">
            <CardHeader title="Team Pipeline" sub="Active pipeline vs. Won (₹L) · top performers" href="/employees" hrefLabel="View team" />
            <div className="card-body">
              {teamBars.length > 0 ? (
                <>
                  <BarChart bars={teamBars} height={130} />
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-3)" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--infra-blue)" }} />
                      Active Pipeline
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-3)" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--success)" }} />
                      Won
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--fg-4)", fontSize: 13 }}>No pipeline data per employee yet</p>
              )}
            </div>
          </div>

          {/* Team KRA Progress */}
          <div className="card">
            <CardHeader title="Team KRA Progress" sub="Avg. progress this quarter" href="/kras" />
            <div className="card-body" style={{ padding: 0 }}>
              {teamKra.length === 0 ? (
                <p style={{ color: "var(--fg-4)", fontSize: 13, padding: "12px 18px" }}>No KRA data</p>
              ) : (
                teamKra.sort((a, b) => b.avgProgress - a.avgProgress).slice(0, 8).map(emp => (
                  <div key={emp.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={emp.name} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>{emp.name.split(" ")[0]}</span>
                        <span style={{ fontSize: 11, color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>
                          {emp.avgProgress}% · {emp.kraCount} KRA{emp.kraCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <ProgressBar
                        value={emp.avgProgress}
                        color={emp.avgProgress >= 75 ? "var(--success)" : emp.avgProgress >= 40 ? "var(--ot-orange)" : "var(--caveo-red)"}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Complete Team View ───────────────────────────────────────────── */}
        <div className="card">
          <CardHeader title="Team Task Health" sub="All members · active tasks breakdown" href="/pipeline/tasks" hrefLabel="All tasks" />
          <div style={{ overflowX: "auto" }}>
            <table className="crm-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="num">Due Today</th>
                  <th className="num">In Progress</th>
                  <th className="num">Overdue</th>
                  <th className="num">Total Active</th>
                  <th className="num">Pipeline</th>
                  <th className="num">Won</th>
                  <th className="num">KRA Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teamTaskHealth
                  .sort((a, b) => b.overdue - a.overdue || b.today - a.today)
                  .map(m => {
                    const kra = teamKra.find(k => k.id === m.id);
                    const pipe = teamPipeline.find(p => p.id === m.id);
                    const total = m.today + m.inProgress + m.overdue;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={m.name} size={26} />
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.name}</span>
                          </div>
                        </td>
                        <td className="num">
                          <span style={{ color: m.today > 0 ? "var(--infra-blue)" : "var(--fg-4)", fontWeight: m.today > 0 ? 700 : 400 }}>{m.today}</span>
                        </td>
                        <td className="num">
                          <span style={{ color: m.inProgress > 0 ? "var(--ot-orange)" : "var(--fg-4)", fontWeight: m.inProgress > 0 ? 700 : 400 }}>{m.inProgress}</span>
                        </td>
                        <td className="num">
                          {m.overdue > 0
                            ? <span style={{ background: "var(--caveo-red-50)", color: "var(--caveo-red)", fontWeight: 700, padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>{m.overdue}</span>
                            : <span style={{ color: "var(--fg-4)" }}>0</span>
                          }
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>{total}</td>
                        <td className="num" style={{ fontSize: 12 }}>{pipe ? fmtShort(pipe.pipeline) : "—"}</td>
                        <td className="num" style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>{pipe?.won ? fmtShort(pipe.won) : "—"}</td>
                        <td style={{ minWidth: 100 }}>
                          {kra ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ProgressBar
                                value={kra.avgProgress}
                                color={kra.avgProgress >= 75 ? "var(--success)" : kra.avgProgress >= 40 ? "var(--ot-orange)" : "var(--caveo-red)"}
                              />
                              <span style={{ fontSize: 11, color: "var(--fg-3)", minWidth: 28 }}>{kra.avgProgress}%</span>
                            </div>
                          ) : <span style={{ color: "var(--fg-4)", fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          <Link href={`/employees/${m.id}`} style={{ fontSize: 11, color: "var(--infra-blue)", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
                            View <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Today Tasks + Collections ────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Today's tasks */}
          <div className="card">
            <CardHeader
              title="Today's Tasks"
              sub={`${activeTodayTasks.length} pending · ${activeOverdueTasks.length} overdue`}
              href="/pipeline/tasks"
            />
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeOverdueTasks.length > 0 && (
                <div style={{ background: "var(--caveo-red-50)", borderRadius: 8, padding: "8px 12px", marginBottom: 4 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--caveo-red)", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={13} /> {activeOverdueTasks.length} overdue task{activeOverdueTasks.length !== 1 ? "s" : ""} need attention
                  </div>
                </div>
              )}
              {activeTodayTasks.length === 0 && activeOverdueTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--fg-4)" }}>
                  <CheckCircle2 size={28} style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13 }}>All caught up!</p>
                </div>
              ) : (
                [...activeOverdueTasks.slice(0, 3), ...activeTodayTasks.slice(0, 5)].map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} busyId={busyId} showAssignee />
                ))
              )}
            </div>
          </div>

          {/* Collections */}
          <div className="card">
            <CardHeader title="Collection Alerts" sub={`${overdueCollections.length} overdue · ${upcomingCollections.length} due soon`} href="/collections" />
            <div className="card-body" style={{ padding: 0 }}>
              {overdueCollections.length === 0 && upcomingCollections.length === 0 ? (
                <p style={{ padding: "16px 18px", color: "var(--fg-4)", fontSize: 13 }}>No pending collections</p>
              ) : (
                <>
                  {filteredColls.slice(0, 4).map(c => {
                    const outstanding = c.invoiceValueLakhs - c.amountReceivedLakhs;
                    const daysOverdue = Math.floor((today.getTime() - new Date(c.dueDate).getTime()) / 86400000);
                    return (
                      <div key={c.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>{c.customerName}</div>
                          <div style={{ fontSize: 11, color: "var(--caveo-red)", marginTop: 2 }}>
                            {daysOverdue > 0 ? `${daysOverdue}d overdue` : relDate(c.dueDate)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>₹{outstanding.toFixed(2)}L</div>
                          <div style={{ fontSize: 10, color: "var(--fg-4)" }}>outstanding</div>
                        </div>
                      </div>
                    );
                  })}
                  {upcomingCollections.slice(0, 3).map(c => {
                    const outstanding = c.invoiceValueLakhs - c.amountReceivedLakhs;
                    return (
                      <div key={c.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>{c.customerName}</div>
                          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{relDate(c.dueDate)}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>₹{outstanding.toFixed(2)}L</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Pending Certs ────────────────────────────────────────────────── */}
        {pendingCerts.length > 0 && (
          <div className="card">
            <CardHeader title="Pending Certifications" sub={`${pendingCerts.length} awaiting review`} href="/kras" />
            <div style={{ padding: "8px 0" }}>
              {pendingCerts.slice(0, 5).map(cert => (
                <div key={cert.id} style={{ padding: "8px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
                  <Target size={14} style={{ color: "var(--caveo-red)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{cert.certName}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{cert.employee.name} · {cert.kra.title}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)", flexShrink: 0 }}>{cert.issuingBody}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMPLOYEE DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────

  const avgKraProgress = myKras.length > 0
    ? Math.round(myKras.reduce((s, k) => s + (k.reviews[0]?.progress ?? 0), 0) / myKras.length)
    : 0;

  const allWins = [...recentWins, ...legacyWins];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-eyebrow">Week {currentWeek} · {currentYear}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, margin: 0, color: "var(--fg-1)" }}>
            {greeting(hour)}, {employeeName.split(" ")[0]} 👋
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4, marginBottom: 0 }}>
            {activeTodayTasks.length} tasks today
            {activeOverdueTasks.length > 0 && <> · <span style={{ color: "var(--caveo-red)", fontWeight: 600 }}>{activeOverdueTasks.length} overdue</span></>}
            {` · ₹${fmtShort(pipelineValue)} in pipeline`}
          </p>
        </div>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", minWidth: 220 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, leads…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--fg-1)", fontFamily: "var(--font-sans)", width: 180 }}
          />
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiTile
          label="Tasks Today" value={activeTodayTasks.length}
          delta={`${activeOverdueTasks.length} overdue`} deltaDir={activeOverdueTasks.length > 0 ? "down" : "up"}
          spark={[1,2,2,3,3,2,activeTodayTasks.length]} sparkColor="var(--infra-blue)"
        />
        <KpiTile
          label="Active Pipeline" value={fmtShort(pipelineValue)}
          delta={`${totalOpps} deals`} deltaDir="up"
          spark={[4,5,6,8,9,pipelineValue/20,pipelineValue/10]} sparkColor="var(--ot-orange)"
          accent
        />
        <KpiTile
          label="Won Value" value={fmtShort(wonValue)}
          delta={totalOpps > 0 ? `${Math.round(wonValue/(wonValue+pipelineValue+0.01)*100)}% rate` : "—"} deltaDir="up"
          spark={[2,4,6,5,8,wonValue/5,wonValue/3]} sparkColor="var(--success)"
        />
        <KpiTile
          label="KRA Progress" value={avgKraProgress} unit="%"
          delta={`${myKras.length} KRA${myKras.length !== 1 ? "s" : ""}`} deltaDir={avgKraProgress >= 50 ? "up" : "down"}
          spark={[20,30,35,40,45,avgKraProgress-5,avgKraProgress]} sparkColor={avgKraProgress >= 50 ? "var(--success)" : "var(--caveo-red)"}
        />
      </div>

      {/* ── Tasks + Pipeline ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Tasks */}
        <div className="card">
          <CardHeader title="My Tasks" sub={`${activeTodayTasks.length} today · ${activeOverdueTasks.length} overdue · ${activeUpcomingTasks.length} upcoming`} href="/pipeline/tasks" />
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeOverdueTasks.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--caveo-red)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                  Overdue
                </div>
                {activeOverdueTasks.slice(0, 3).map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} busyId={busyId} />
                ))}
              </div>
            )}
            {activeTodayTasks.length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                  Due Today
                </div>
                {activeTodayTasks.filter(t => !q || t.title.toLowerCase().includes(q) || t.lead?.companyName.toLowerCase().includes(q)).map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} busyId={busyId} />
                ))}
              </div>
            )}
            {activeTodayTasks.length === 0 && activeOverdueTasks.length === 0 && (
              <div style={{ textAlign: "center", padding: 28, color: "var(--fg-4)" }}>
                <CheckCircle2 size={28} style={{ margin: "0 auto 8px", display: "block" }} />
                <p style={{ margin: 0, fontSize: 13 }}>All caught up for today!</p>
                {activeUpcomingTasks.length > 0 && <p style={{ margin: "6px 0 0", fontSize: 12 }}>{activeUpcomingTasks.length} tasks coming up this week</p>}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline snapshot */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <CardHeader title="Pipeline Snapshot" sub={`${totalLeads} leads`} href="/pipeline/leads" />
            <div className="card-body">
              {donutSlices.length > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <DonutChart slices={donutSlices} size={100} strokeW={16} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {funnelStages.slice(0, 5).map(s => (
                      <FunnelBar key={s.stage} label={s.label} count={s.count} max={maxCount} color={s.color} total={totalFunnel} />
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--fg-4)", fontSize: 13, textAlign: "center", padding: 16 }}>No leads yet</p>
              )}
            </div>
          </div>

          {/* Collections */}
          {(overdueCollections.length > 0 || upcomingCollections.length > 0) && (
            <div className="card">
              <CardHeader title="Collections" sub={`${overdueCollections.length} overdue`} href="/collections" />
              <div style={{ padding: "4px 0" }}>
                {[...overdueCollections, ...upcomingCollections].slice(0, 3).map(c => {
                  const outstanding = c.invoiceValueLakhs - c.amountReceivedLakhs;
                  const isOverdue = new Date(c.dueDate) < today;
                  return (
                    <div key={c.id} style={{ padding: "8px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{c.customerName}</div>
                        <div style={{ fontSize: 11, color: isOverdue ? "var(--caveo-red)" : "var(--fg-4)", marginTop: 1 }}>{relDate(c.dueDate)}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)" }}>₹{outstanding.toFixed(2)}L</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KRA Progress + Weekly Commits ────────────────────────────────── */}
      {myKras.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          <div className="card">
            <CardHeader title="My KRAs" sub={`${myKras.length} active · ${avgKraProgress}% avg progress`} href="/kras" />
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {myKras.map(kra => {
                const progress = kra.reviews[0]?.progress ?? 0;
                const score = kra.reviews[0]?.score ?? 0;
                return (
                  <div key={kra.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{kra.title}</span>
                        <span style={{ fontSize: 11, color: "var(--fg-4)", marginLeft: 8 }}>Weight: {kra.weight}%</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: progress >= 75 ? "var(--success)" : progress >= 40 ? "var(--ot-orange)" : "var(--caveo-red)" }}>
                          {progress}%
                        </span>
                        {score > 0 && <span style={{ fontSize: 11, color: "var(--fg-4)", marginLeft: 6 }}>Score: {score}</span>}
                      </div>
                    </div>
                    <ProgressBar
                      value={progress}
                      color={progress >= 75 ? "var(--success)" : progress >= 40 ? "var(--ot-orange)" : "var(--caveo-red)"}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly commits */}
          <div className="card">
            <CardHeader title="This Week's Commits" sub={`Week ${currentWeek}`} />
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weeklyCommits.length === 0 ? (
                <div style={{ textAlign: "center", padding: 16, color: "var(--fg-4)" }}>
                  <p style={{ margin: 0, fontSize: 13 }}>No commits this week yet</p>
                  <Link href="/daily-updates" style={{ fontSize: 12, color: "var(--infra-blue)", marginTop: 8, display: "block" }}>
                    Add your update →
                  </Link>
                </div>
              ) : (
                weeklyCommits.map(wc => (
                  <div key={wc.id} style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, color: "var(--caveo-red)", fontWeight: 600, marginBottom: 3 }}>{wc.kra.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--fg-1)" }}>{wc.commitText}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Wins ──────────────────────────────────────────────────── */}
      {allWins.length > 0 && (
        <div className="card">
          <CardHeader title="Recent Wins 🏆" sub="Closed opportunities" href="/pipeline/opportunities" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, padding: "12px 18px" }}>
            {allWins.slice(0, 6).map((w, i) => (
              <div key={i} style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid var(--success)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Trophy size={13} style={{ color: "var(--success)" }} />
                  <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {w.isLegacy ? "Legacy" : "CRM"}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>{w.companyName}</div>
                {w.opportunityName && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{w.opportunityName}</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)", marginTop: 6 }}>₹{w.value.toFixed(2)}L</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming tasks ───────────────────────────────────────────────── */}
      {activeUpcomingTasks.length > 0 && (
        <div className="card">
          <CardHeader title="Upcoming This Week" sub={`${activeUpcomingTasks.length} tasks`} href="/pipeline/tasks" />
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeUpcomingTasks.slice(0, 4).map(t => (
              <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} busyId={busyId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
