"use client";

/**
 * Finance Dashboard — Step 2H.
 * Wired to GET /api/finance/dashboard (read-only live data).
 * Write actions are feature-gated with WRITE_GATE_MSG until write APIs ship.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Wallet, Landmark, Receipt, CalendarDays, ShieldCheck, Layers,
  TrendingUp, Users, Plus, FileText, Banknote, ArrowRight,
  AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import { inrToLakhsEquivalent } from "@/lib/money";

// ─── Money helpers ─────────────────────────────────────────────────────────────

// cashBalance/bankBalance (FinAccount) and cashFlow/bankFlow (Ledger) are NOT part of
// Release 1 — they remain ₹ Lakhs, so these two helpers keep the ×100,000 conversion.
function lakhsToRupees(s: string): number {
  return Math.round(Number(s) * 100000 * 100) / 100;
}

function fmtRupees(s: string): string {
  const r = lakhsToRupees(s);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(r);
}

// Step 3Q (Release 1): todayExpense/monthlyExpense/employeeClaimsPending/
// advancesOutstanding/customerExpenses are now actual ₹ INR — parse directly, no
// ×100,000 multiplication (unlike fmtRupees above, which is for still-Lakhs fields).
function fmtINRDirect(s: string): string {
  const r = Math.round(Number(s) * 100) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(r);
}

// Expense-sourced chart values (trend/category breakdown/top categories) are now
// actual ₹ INR from the API; fmt()/fmtShort() below assume a Lakhs-scale input for
// their Cr/L/K compact-display thresholds — convert back to a Lakhs-equivalent number
// before feeding them in, so the existing chart formatting logic keeps working.
// (inrToLakhsEquivalent is now the shared helper from src/lib/money.ts, promoted there
// in Release 2 since Sales/KRA surfaces need the same conversion.)

function fmtShort(lakhs: number): string {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(1)}Cr`;
  return `${lakhs.toFixed(1)}L`;
}

function fmt(lakhs: number): string {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}Cr`;
  if (lakhs >= 1) return `₹${lakhs.toFixed(1)}L`;
  return `₹${(lakhs * 100).toFixed(0)}K`;
}

// ─── API response type ─────────────────────────────────────────────────────────

interface ApiDashboard {
  period: { dateFrom: string; dateTo: string; label: string };
  summaryCards: {
    cashBalance: string; bankBalance: string;
    todayExpense: string; monthlyExpense: string;
    pendingApprovals: number;
    employeeClaimsPending: string; advancesOutstanding: string; customerExpenses: string;
  };
  cashFlow: { totalCashIn: string; totalCashOut: string; netCashFlow: string };
  bankFlow: { totalCredits: string; totalDebits: string; netBankFlow: string };
  expenseBreakdown: Array<{ category: string; amount: string; count: number }>;
  monthlyExpenseTrend: Array<{ month: string; amount: string }>;
  topExpenseCategories: Array<{ category: string; amount: string; percentage: string }>;
  pendingItems: {
    approvals: number; unpaidExpenses: number; pendingAdvances: number; pendingClaims: number;
  };
}

// ─── Period filter ─────────────────────────────────────────────────────────────

const PERIODS = ["This Month", "Last Month", "This Quarter", "This FY"] as const;
type Period = (typeof PERIODS)[number];

function periodToParams(period: Period): URLSearchParams {
  const p = new URLSearchParams();
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-indexed

  switch (period) {
    case "This Month": {
      const mo = String(m + 1).padStart(2, "0");
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      p.set("dateFrom", `${y}-${mo}-01`);
      p.set("dateTo", `${y}-${mo}-${String(lastDay).padStart(2, "0")}`);
      break;
    }
    case "Last Month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const mo = String(lm + 1).padStart(2, "0");
      const lastDay = new Date(Date.UTC(ly, lm + 1, 0)).getUTCDate();
      p.set("dateFrom", `${ly}-${mo}-01`);
      p.set("dateTo", `${ly}-${mo}-${String(lastDay).padStart(2, "0")}`);
      break;
    }
    case "This Quarter": {
      const qStart = Math.floor(m / 3) * 3;
      const qEnd = qStart + 2;
      p.set("dateFrom", `${y}-${String(qStart + 1).padStart(2, "0")}-01`);
      const lastDay = new Date(Date.UTC(y, qEnd + 1, 0)).getUTCDate();
      p.set("dateTo", `${y}-${String(qEnd + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
      break;
    }
    case "This FY": {
      // Indian FY: April 1 → March 31
      const fyStart = m < 3 ? y - 1 : y;
      const fyEnd = fyStart + 1;
      p.set("financialYear", `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`);
      break;
    }
  }
  return p;
}

// ─── Month label from "YYYY-MM" ISO string ────────────────────────────────────

function monthLabel(iso: string): string {
  const [yr, mo] = iso.split("-");
  return new Date(Number(yr), Number(mo) - 1, 1)
    .toLocaleDateString("en-IN", { month: "short" });
}

// ─── Category colors (mirrors Phase 2 palette) ────────────────────────────────

const CATEGORY_COLORS = [
  "#C8102E", "#0066FF", "#FF6B00", "#1F9D55",
  "#8E0A1F", "#2B2F36", "#C8CDD3", "#5B626C",
];

// ─── Chart primitives (unchanged from Phase 2 mock) ───────────────────────────

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

function DonutChart({ slices, size = 132, strokeW = 20 }: {
  slices: { value: number; color: string; name: string }[];
  size?: number; strokeW?: number;
}) {
  const total = slices.reduce((s, item) => s + item.value, 0) || 1;
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
        {fmt(slices.reduce((s, item) => s + item.value, 0))}
      </text>
      <text x={size / 2} y={size / 2 + 13} textAnchor="middle" fontSize="8.5" fill="var(--fg-4)" letterSpacing="0.1em">
        EXPENSES
      </text>
    </svg>
  );
}

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

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({ label, value, icon: Icon, sub, accent, href }: {
  label: string; value: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  sub?: string; accent?: boolean; href?: string;
}) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{label}</div>
        <Icon size={15} strokeWidth={1.7} />
      </div>
      <div className="kpi-value">{value}</div>
      {sub && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{sub}</span>
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
  if (href) return <Link href={href} className={cls} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}

// ─── Chart card shell ─────────────────────────────────────────────────────────

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

// ─── Flow stat row ────────────────────────────────────────────────────────────

type FlowSign = "positive" | "negative" | "neutral";

function FlowRow({ label, value, sign }: { label: string; value: string; sign?: FlowSign }) {
  const color = sign === "positive" ? "#1F9D55" : sign === "negative" ? "var(--caveo-red)" : "var(--fg-1)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ─── Pending item row ─────────────────────────────────────────────────────────

function PendingRow({ label, count, href }: { label: string; count: number; href?: string }) {
  const inner = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{label}</span>
      <span style={{
        fontSize: 11.5, fontWeight: 700,
        color: count > 0 ? "var(--caveo-red)" : "var(--fg-4)",
        background: count > 0 ? "rgba(200,16,46,0.08)" : "var(--bg-muted)",
        padding: "2px 10px", borderRadius: 12,
      }}>{count}</span>
    </div>
  );
  if (href && count > 0) return <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
  return inner;
}

// ─── Empty chart placeholder ──────────────────────────────────────────────────

function EmptyChart({ height = 154, message = "No data for this period" }: { height?: number; message?: string }) {
  return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-4)", fontSize: 13 }}>
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FinanceDashboardClient({ employeeName }: { employeeName: string }) {
  const [period, setPeriod] = useState<Period>("This Month");
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const WRITE_GATE_MSG = "This action will be enabled after Finance write APIs are implemented.";

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  const fetchDashboard = useCallback(async (p: Period) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const params = periodToParams(p);
      const res = await fetch(`/api/finance/dashboard?${params.toString()}`, { signal: ctrl.signal });
      if (res.status === 401 || res.status === 403) {
        setError("You don't have permission to view the finance dashboard.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.success && json?.data) {
        setData(json.data as ApiDashboard);
      } else {
        throw new Error("Unexpected response shape.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Unable to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(period);
  }, [fetchDashboard, period]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Derived display values ──────────────────────────────────────────────────

  const sc = data?.summaryCards;
  const cf = data?.cashFlow;
  const bf = data?.bankFlow;
  const pi = data?.pendingItems;

  // Expense-sourced — API now returns actual ₹ INR (Step 3Q Release 1); convert to a
  // Lakhs-equivalent number so the existing fmt()/fmtShort() Cr/L/K chart formatters
  // (calibrated for Lakhs-scale input) keep displaying correctly.
  const trendBars = (data?.monthlyExpenseTrend ?? []).map((t) => ({
    label: monthLabel(t.month),
    value: inrToLakhsEquivalent(Number(t.amount)),
    color: "var(--caveo-red)" as string,
  }));

  const catSlices = (data?.expenseBreakdown ?? []).map((c, i) => ({
    value: inrToLakhsEquivalent(Number(c.amount)),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    name: c.category,
  }));

  const topCats = data?.topExpenseCategories ?? [];
  const catMax = topCats.reduce((mx, c) => Math.max(mx, inrToLakhsEquivalent(Number(c.amount))), 0.001);

  const netCashSign: FlowSign = cf
    ? (Number(cf.netCashFlow) > 0 ? "positive" : Number(cf.netCashFlow) < 0 ? "negative" : "neutral")
    : "neutral";
  const netBankSign: FlowSign = bf
    ? (Number(bf.netBankFlow) > 0 ? "positive" : Number(bf.netBankFlow) < 0 ? "negative" : "neutral")
    : "neutral";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--cyber-black)", color: "#fff", padding: "10px 20px",
          borderRadius: 8, fontSize: 13, zIndex: 9999, maxWidth: 440, textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div className="page-eyebrow">FINANCE</div>
          <h1 className="page-title">Finance Dashboard</h1>
          <p className="page-sub">
            {data?.period?.label
              ? `Live figures for ${data.period.label} — ${employeeName}.`
              : `Cash, expenses, approvals, and outstanding items — ${employeeName}.`}
          </p>
        </div>

        {/* Quick actions — write actions gated until write APIs land */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => flash(WRITE_GATE_MSG)} className="btn-cav btn-cav-primary">
            <Plus size={14} /> <Receipt size={14} /> Add Expense
          </button>
          <Link href="/finance/cash-book" className="btn-cav btn-cav-secondary">
            <Banknote size={14} /> Cash Book
          </Link>
          <button onClick={() => flash(WRITE_GATE_MSG)} className="btn-cav btn-cav-secondary">
            <FileText size={14} /> Create Voucher
          </button>
          <button onClick={() => flash(WRITE_GATE_MSG)} className="btn-cav btn-cav-secondary">
            <Wallet size={14} /> Employee Advance
          </button>
        </div>
      </div>

      {/* ── Period filter ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="seg-control">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={period === p ? "active" : ""}
              onClick={() => setPeriod(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>
        {loading && (
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--caveo-red)" }} />
        )}
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {error && !loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)",
          borderRadius: 10, marginBottom: 16,
        }}>
          <AlertCircle size={18} color="var(--caveo-red)" />
          <span style={{ fontSize: 13.5, color: "var(--fg-2)", flex: 1 }}>{error}</span>
          <button
            onClick={() => fetchDashboard(period)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--caveo-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── KPI strip (8 cards) ──────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KpiTile
          label="Cash Balance"
          value={sc ? fmtRupees(sc.cashBalance) : "—"}
          icon={Banknote} accent
          href="/finance/cash-book"
        />
        <KpiTile
          label="Bank Balance"
          value={sc ? fmtRupees(sc.bankBalance) : "—"}
          icon={Landmark} accent
          href="/finance/bank-book"
        />
        <KpiTile
          label="Today's Expense"
          value={sc ? fmtINRDirect(sc.todayExpense) : "—"}
          icon={CalendarDays}
        />
        <KpiTile
          label="Monthly Expense"
          value={sc ? fmtINRDirect(sc.monthlyExpense) : "—"}
          icon={Receipt}
          href="/finance/expenses"
        />
        <KpiTile
          label="Pending Approvals"
          value={sc != null ? String(sc.pendingApprovals) : "—"}
          icon={ShieldCheck}
          href="/finance/approvals"
        />
        <KpiTile
          label="Claims Pending"
          value={sc ? fmtINRDirect(sc.employeeClaimsPending) : "—"}
          icon={Layers}
          href="/finance/claims"
        />
        <KpiTile
          label="Advances Outstanding"
          value={sc ? fmtINRDirect(sc.advancesOutstanding) : "—"}
          icon={Wallet}
          href="/finance/advances"
        />
        <KpiTile
          label="Customer Expenses"
          value={sc ? fmtINRDirect(sc.customerExpenses) : "—"}
          icon={Users}
          href="/finance/expenses"
        />
      </div>

      {/* ── Charts row 1: Trend + Category breakdown ─────────────────────── */}
      <div className="grid-12" style={{ marginBottom: 16 }}>
        <div className="col-7">
          <ChartCard
            title="Monthly Expense Trend"
            sub="Total expenses by month (₹L) — last 6 months"
          >
            {trendBars.length > 0 ? (
              <BarChart bars={trendBars} />
            ) : (
              <EmptyChart message="No expense data available" />
            )}
          </ChartCard>
        </div>
        <div className="col-5">
          <ChartCard title="Category-wise Expense" sub="Current period split">
            {catSlices.length > 0 ? (
              <div className="donut-wrap">
                <DonutChart slices={catSlices} />
                <div className="donut-legend">
                  {catSlices.slice(0, 6).map((c) => (
                    <div className="dl-row" key={c.name}>
                      <span className="dl-swatch" style={{ background: c.color }} />
                      <span className="dl-name">{c.name}</span>
                      <span className="dl-val">{fmt(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChart message="No expense data available" />
            )}
          </ChartCard>
        </div>
      </div>

      {/* ── Charts row 2: Cash & Bank flow + Top categories + Pending items ── */}
      <div className="grid-12">
        <div className="col-7">
          <ChartCard
            title="Cash &amp; Bank Flow"
            sub={`Period inflow vs outflow — ${data?.period?.label ?? "—"}`}
            right={
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--fg-3)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: "#1F9D55", display: "inline-block" }} /> In
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--caveo-red)", display: "inline-block" }} /> Out
                </span>
              </div>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, paddingTop: 6 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-4)", letterSpacing: "0.1em", marginBottom: 4 }}>CASH</div>
                <FlowRow label="Cash In" value={cf ? fmtRupees(cf.totalCashIn) : "—"} sign="positive" />
                <FlowRow label="Cash Out" value={cf ? fmtRupees(cf.totalCashOut) : "—"} sign="negative" />
                <FlowRow label="Net Cash Flow" value={cf ? fmtRupees(cf.netCashFlow) : "—"} sign={netCashSign} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-4)", letterSpacing: "0.1em", marginBottom: 4 }}>BANK</div>
                <FlowRow label="Credits" value={bf ? fmtRupees(bf.totalCredits) : "—"} sign="positive" />
                <FlowRow label="Debits" value={bf ? fmtRupees(bf.totalDebits) : "—"} sign="negative" />
                <FlowRow label="Net Bank Flow" value={bf ? fmtRupees(bf.netBankFlow) : "—"} sign={netBankSign} />
              </div>
            </div>
          </ChartCard>
        </div>

        <div className="col-5">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <ChartCard title="Top Expense Categories" sub="Highest spend this period">
              {topCats.length > 0 ? (
                <div style={{ paddingTop: 4 }}>
                  {topCats.map((c, i) => (
                    <ValueBar
                      key={c.category}
                      label={c.category}
                      value={inrToLakhsEquivalent(Number(c.amount))}
                      max={catMax}
                      color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    />
                  ))}
                </div>
              ) : (
                <EmptyChart height={80} message="No categories this period" />
              )}
            </ChartCard>

            <ChartCard title="Pending Items" sub="Action required">
              <div>
                <PendingRow label="Approval Requests" count={pi?.approvals ?? 0} href="/finance/approvals" />
                <PendingRow label="Unpaid Expenses" count={pi?.unpaidExpenses ?? 0} href="/finance/expenses" />
                <PendingRow label="Pending Advances" count={pi?.pendingAdvances ?? 0} href="/finance/advances" />
                <PendingRow label="Travel Claims" count={pi?.pendingClaims ?? 0} href="/finance/claims" />
              </div>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
