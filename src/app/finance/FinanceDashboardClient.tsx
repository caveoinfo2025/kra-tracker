"use client";

/**
 * Finance Dashboard — Phase 2 (UI only).
 *
 * Renders from an illustrative MOCK dataset (no finance APIs exist yet — those
 * arrive in Phase 5+). Styling reuses the existing CRM dashboard language:
 * `.kpi` tiles, `.card`, `.grid-12`, inline-SVG charts, and `.btn-cav` buttons —
 * identical to `src/app/dashboard/DashboardClient.tsx`.
 *
 * To wire real data later: replace `deriveData()` with values fetched in the
 * server `page.tsx` and passed down as props in the same shape.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet, Landmark, Receipt, CalendarDays, ShieldCheck, Layers,
  TrendingUp, TrendingDown, Users, Plus, FileText, Banknote, ArrowRight,
  Info,
} from "lucide-react";

// ─── Money formatting (mirrors DashboardClient) ───────────────────────────────

function fmt(lakhs: number): string {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}Cr`;
  if (lakhs >= 1) return `₹${lakhs.toFixed(1)}L`;
  return `₹${(lakhs * 100).toFixed(0)}K`;
}
function fmtShort(lakhs: number): string {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(1)}Cr`;
  return `${lakhs.toFixed(1)}L`;
}

// ─── Filter option sets ───────────────────────────────────────────────────────

const PERIODS = ["This Month", "Last Month", "This Quarter", "This FY"] as const;
type Period = (typeof PERIODS)[number];

const BRANCHES = ["All Branches", "Head Office", "Bangalore", "Chennai"] as const;
type Branch = (typeof BRANCHES)[number];

const ACCOUNTS = ["All Accounts", "Cash — HO", "HDFC Current", "ICICI Current"] as const;
type Account = (typeof ACCOUNTS)[number];

// Scalar money values scale with the selected period / branch so the filters
// visibly affect the dashboard even on mock data.
const PERIOD_FACTOR: Record<Period, number> = {
  "This Month": 1,
  "Last Month": 0.86,
  "This Quarter": 2.7,
  "This FY": 9.4,
};
const BRANCH_FACTOR: Record<Branch, number> = {
  "All Branches": 1,
  "Head Office": 0.58,
  Bangalore: 0.27,
  Chennai: 0.15,
};

// ─── MOCK base dataset (₹ Lakhs) ──────────────────────────────────────────────

const CATEGORY_COLORS = [
  "#C8102E", "#0066FF", "#FF6B00", "#1F9D55",
  "#8E0A1F", "#2B2F36", "#C8CDD3", "#5B626C",
];

const MOCK = {
  // Point-in-time balances (not period-scaled)
  cashBalance: 4.82,
  cashAccounts: 2,
  bankBalance: 38.65,
  bankAccounts: 3,

  // Period-scaled scalars (base = "This Month", "All Branches")
  todayExpense: 0.42,
  todayCount: 7,
  monthlyExpense: 11.3,
  prevMonthlyExpense: 13.1,
  pendingApprovalsCount: 9,
  pendingApprovalsAmount: 6.4,
  claimsPendingCount: 5,
  claimsPendingAmount: 3.85,
  advancesOutstanding: 2.6,
  advancesEmployees: 4,
  customerExpenses: 7.1,
  topCustomer: "Tata Projects Ltd",

  // Charts
  monthlyTrend: [
    { label: "Jan", value: 9.8 },
    { label: "Feb", value: 12.4 },
    { label: "Mar", value: 15.1 },
    { label: "Apr", value: 10.6 },
    { label: "May", value: 13.9 },
    { label: "Jun", value: 11.3 },
  ],
  categoryBreakdown: [
    { name: "Travel", value: 4.2 },
    { name: "Accommodation", value: 2.6 },
    { name: "Meals", value: 1.4 },
    { name: "Vehicle", value: 1.1 },
    { name: "Office Supplies", value: 0.9 },
    { name: "Communication", value: 0.7 },
    { name: "Professional", value: 0.6 },
    { name: "Other", value: 0.4 },
  ],
  cashFlow: [
    { label: "Jan", inflow: 18.2, outflow: 12.4 },
    { label: "Feb", inflow: 21.0, outflow: 14.8 },
    { label: "Mar", inflow: 16.5, outflow: 17.2 },
    { label: "Apr", inflow: 24.1, outflow: 11.9 },
    { label: "May", inflow: 19.7, outflow: 15.3 },
    { label: "Jun", inflow: 22.4, outflow: 13.1 },
  ],
};

type DashData = ReturnType<typeof deriveData>;

function deriveData(period: Period, branch: Branch) {
  const f = PERIOD_FACTOR[period] * BRANCH_FACTOR[branch];
  const cf = BRANCH_FACTOR[branch]; // category/charts scale by branch only

  return {
    cashBalance: MOCK.cashBalance,
    cashAccounts: MOCK.cashAccounts,
    bankBalance: MOCK.bankBalance,
    bankAccounts: MOCK.bankAccounts,

    todayExpense: MOCK.todayExpense * BRANCH_FACTOR[branch],
    todayCount: Math.max(1, Math.round(MOCK.todayCount * BRANCH_FACTOR[branch])),
    monthlyExpense: MOCK.monthlyExpense * f,
    prevMonthlyExpense: MOCK.prevMonthlyExpense * f,
    pendingApprovalsCount: Math.round(MOCK.pendingApprovalsCount * BRANCH_FACTOR[branch] * (period === "This FY" ? 1 : 1)),
    pendingApprovalsAmount: MOCK.pendingApprovalsAmount * BRANCH_FACTOR[branch],
    claimsPendingCount: Math.round(MOCK.claimsPendingCount * BRANCH_FACTOR[branch]),
    claimsPendingAmount: MOCK.claimsPendingAmount * BRANCH_FACTOR[branch],
    advancesOutstanding: MOCK.advancesOutstanding * BRANCH_FACTOR[branch],
    advancesEmployees: Math.max(1, Math.round(MOCK.advancesEmployees * BRANCH_FACTOR[branch])),
    customerExpenses: MOCK.customerExpenses * f,
    topCustomer: MOCK.topCustomer,

    monthlyTrend: MOCK.monthlyTrend.map((m) => ({ ...m, value: m.value * cf })),
    categoryBreakdown: MOCK.categoryBreakdown
      .map((c, i) => ({ ...c, value: c.value * cf, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.value - a.value),
    cashFlow: MOCK.cashFlow.map((m) => ({
      ...m, inflow: m.inflow * cf, outflow: m.outflow * cf,
    })),
  };
}

// ─── Chart primitives (mirror DashboardClient) ────────────────────────────────

/** Vertical bar chart — optional second series (grouped). */
function BarChart({ bars, height = 130 }: {
  bars: { label: string; value: number; color?: string; secondValue?: number; secondColor?: string }[];
  height?: number;
}) {
  const maxVal = Math.max(...bars.map((b) => Math.max(b.value, b.secondValue ?? 0)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: height + 24, paddingBottom: 20 }}>
      {bars.map((b, i) => {
        const pct = (b.value / maxVal) * 100;
        const pct2 = b.secondValue != null ? (b.secondValue / maxVal) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%", height: `${height}px` }}>
              <div
                style={{ flex: 1, height: `${pct}%`, background: b.color ?? "var(--caveo-red)", borderRadius: "3px 3px 0 0", minHeight: pct > 0 ? 3 : 0, transition: "height 0.5s var(--ease-out)" }}
                title={`${b.label}: ${fmtShort(b.value)}`}
              />
              {b.secondValue != null && (
                <div
                  style={{ flex: 1, height: `${pct2}%`, background: b.secondColor ?? "var(--infra-blue)", borderRadius: "3px 3px 0 0", minHeight: pct2 > 0 ? 3 : 0, transition: "height 0.5s var(--ease-out)" }}
                  title={`${b.label}: ${fmtShort(b.secondValue)}`}
                />
              )}
            </div>
            <span style={{ fontSize: 9.5, color: "var(--fg-4)", textAlign: "center", lineHeight: 1.2, marginTop: 4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** SVG donut chart with a configurable center label. */
function DonutChart({ slices, size = 132, strokeW = 20, centerLabel }: {
  slices: { value: number; color: string; name: string }[];
  size?: number; strokeW?: number; centerLabel?: string;
}) {
  const total = slices.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-muted)" strokeWidth={strokeW} fill="none" />
      {slices.map((sl, i) => {
        const frac = sl.value / total;
        const dashArray = `${c * frac} ${c - c * frac}`;
        const dashOffset = -c * (acc / total);
        acc += sl.value;
        return (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={r}
            stroke={sl.color} strokeWidth={strokeW} fill="none"
            strokeDasharray={dashArray} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 0.5s var(--ease-out)" }}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fontWeight="700" fill="var(--fg-1)">
        {fmt(total)}
      </text>
      <text x={size / 2} y={size / 2 + 13} textAnchor="middle" fontSize="8.5" fill="var(--fg-4)" letterSpacing="0.1em">
        {centerLabel ?? "TOTAL"}
      </text>
    </svg>
  );
}

/** Horizontal value bar (top-categories list). */
function ValueBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <div style={{ width: 110, fontSize: 11.5, color: "var(--fg-2)", fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: "var(--bg-muted)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 5, transition: "width 0.6s var(--ease-out)" }} />
      </div>
      <div style={{ width: 52, fontSize: 11.5, color: "var(--fg-1)", fontWeight: 600, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</div>
    </div>
  );
}

// ─── KPI tile (mirrors DashboardClient) ───────────────────────────────────────

function KpiTile({ label, value, icon: Icon, sub, delta, deltaDir, accent, href }: {
  label: string; value: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  sub?: string; delta?: string; deltaDir?: "up" | "down"; accent?: boolean; href?: string;
}) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{label}</div>
        <Icon size={15} strokeWidth={1.7} />
      </div>
      <div className="kpi-value">{value}</div>
      {(delta || sub) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          {delta ? (
            <div className={`kpi-delta ${deltaDir ?? "up"}`}>
              {deltaDir === "down" ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {delta}
            </div>
          ) : <span />}
          {sub && <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{sub}</span>}
        </div>
      )}
      {href && (
        <div style={{ marginTop: 2, fontSize: 10.5, color: "var(--caveo-red)", display: "flex", alignItems: "center", gap: 3, opacity: 0.75 }}>
          View <ArrowRight size={10} />
        </div>
      )}
    </>
  );
  const cls = "kpi" + (accent ? " kpi-accent" : "") + (href ? " kpi-link" : "");
  if (href) {
    return <Link href={href} className={cls} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  }
  return <div className={cls}>{inner}</div>;
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon, primary }: {
  href: string; label: string; icon: React.ComponentType<{ size?: number }>; primary?: boolean;
}) {
  return (
    <Link href={href} className={`btn-cav ${primary ? "btn-cav-primary" : "btn-cav-secondary"}`}>
      <Plus size={14} />
      <Icon size={14} />
      {label}
    </Link>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function ChartCard({ title, sub, right, children }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header">
        <div>
          <div className="ch-title">{title}</div>
          {sub && <div className="ch-sub">{sub}</div>}
        </div>
        {right}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FinanceDashboardClient({ employeeName }: { employeeName: string }) {
  const [period, setPeriod] = useState<Period>("This Month");
  const [branch, setBranch] = useState<Branch>("All Branches");
  const [account, setAccount] = useState<Account>("All Accounts");

  const d: DashData = useMemo(() => deriveData(period, branch), [period, branch]);

  const monthDeltaPct =
    d.prevMonthlyExpense > 0
      ? (((d.monthlyExpense - d.prevMonthlyExpense) / d.prevMonthlyExpense) * 100)
      : 0;

  // Account filter narrows which balance tiles are emphasised (cosmetic on mock).
  const showCash = account === "All Accounts" || account.startsWith("Cash");
  const showBank = account === "All Accounts" || !account.startsWith("Cash");

  const catMax = Math.max(...d.categoryBreakdown.map((c) => c.value), 0.001);
  const topCategories = d.categoryBreakdown.slice(0, 5);

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div className="page-eyebrow">FINANCE</div>
          <h1 className="page-title">Finance Dashboard</h1>
          <p className="page-sub">Cash, expenses, approvals, and outstanding items at a glance, {employeeName}.</p>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <QuickAction href="/finance/expenses/new" label="Add Expense" icon={Receipt} primary />
          <QuickAction href="/finance/cash-book" label="Cash Entry" icon={Banknote} />
          <QuickAction href="/finance/vouchers" label="Create Voucher" icon={FileText} />
          <QuickAction href="/finance/advances" label="Employee Advance" icon={Wallet} />
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="seg-control">
          {PERIODS.map((p) => (
            <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>

        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value as Branch)}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--bg-elev)", borderColor: "var(--border)", color: "var(--fg-1)", height: 34 }}
        >
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={account}
          onChange={(e) => setAccount(e.target.value as Account)}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--bg-elev)", borderColor: "var(--border)", color: "var(--fg-1)", height: 34 }}
        >
          {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 11, color: "var(--fg-4)" }}>
          <Info size={12} />
          Illustrative data — live figures arrive when finance APIs ship.
        </div>
      </div>

      {/* ── KPI strip (8 cards) ──────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KpiTile label="Cash Balance" value={fmt(d.cashBalance)} icon={Banknote} accent={showCash} sub={`${d.cashAccounts} accounts`} />
        <KpiTile label="Bank Balance" value={fmt(d.bankBalance)} icon={Landmark} accent={showBank} sub={`${d.bankAccounts} accounts`} />
        <KpiTile label="Today's Expense" value={fmt(d.todayExpense)} icon={CalendarDays} sub={`${d.todayCount} entries`} />
        <KpiTile
          label="Monthly Expense" value={fmt(d.monthlyExpense)} icon={Receipt}
          delta={`${Math.abs(monthDeltaPct).toFixed(0)}%`}
          deltaDir={monthDeltaPct <= 0 ? "down" : "up"}
          sub="vs last"
        />
        <KpiTile label="Pending Approvals" value={String(d.pendingApprovalsCount)} icon={ShieldCheck} sub={fmt(d.pendingApprovalsAmount)} href="/finance/approvals" />
        <KpiTile label="Claims Pending" value={String(d.claimsPendingCount)} icon={Layers} sub={fmt(d.claimsPendingAmount)} href="/finance/claims" />
        <KpiTile label="Advances Outstanding" value={fmt(d.advancesOutstanding)} icon={Wallet} sub={`${d.advancesEmployees} employees`} href="/finance/advances" />
        <KpiTile label="Customer Expenses" value={fmt(d.customerExpenses)} icon={Users} sub={`Top: ${d.topCustomer}`} />
      </div>

      {/* ── Charts row 1 ─────────────────────────────────────────────────── */}
      <div className="grid-12" style={{ marginBottom: 16 }}>
        <div className="col-7">
          <ChartCard title="Monthly Expense Trend" sub="Total expenses by month (₹L)">
            <BarChart bars={d.monthlyTrend.map((m) => ({ label: m.label, value: m.value, color: "var(--caveo-red)" }))} />
          </ChartCard>
        </div>
        <div className="col-5">
          <ChartCard title="Category-wise Expense" sub="Current period split">
            <div className="donut-wrap">
              <DonutChart
                slices={d.categoryBreakdown.map((c) => ({ value: c.value, color: c.color, name: c.name }))}
                centerLabel="EXPENSES"
              />
              <div className="donut-legend">
                {d.categoryBreakdown.slice(0, 6).map((c) => (
                  <div className="dl-row" key={c.name}>
                    <span className="dl-swatch" style={{ background: c.color }} />
                    <span className="dl-name">{c.name}</span>
                    <span className="dl-val">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Charts row 2 ─────────────────────────────────────────────────── */}
      <div className="grid-12">
        <div className="col-7">
          <ChartCard
            title="Cash Flow"
            sub="Inflow vs outflow by month (₹L)"
            right={
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--fg-3)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--infra-blue)" }} /> Inflow
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--caveo-red)" }} /> Outflow
                </span>
              </div>
            }
          >
            <BarChart
              bars={d.cashFlow.map((m) => ({
                label: m.label,
                value: m.inflow, color: "var(--infra-blue)",
                secondValue: m.outflow, secondColor: "var(--caveo-red)",
              }))}
            />
          </ChartCard>
        </div>
        <div className="col-5">
          <ChartCard title="Top Expense Categories" sub="Highest spend this period">
            <div style={{ paddingTop: 4 }}>
              {topCategories.map((c) => (
                <ValueBar key={c.name} label={c.name} value={c.value} max={catMax} color={c.color} />
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
