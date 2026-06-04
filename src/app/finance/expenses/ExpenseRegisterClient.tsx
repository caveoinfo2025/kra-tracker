"use client";

/**
 * Expense Register — orchestrator (Phase 2, UI only). Mirrors Cash/Bank Book.
 */

import { useMemo, useState } from "react";
import {
  Plus, Users, UserPlus, Upload, FileSpreadsheet, FileText, Info, Receipt,
  CalendarDays, Clock, CheckCircle2, BadgeIndianRupee, Wallet, TrendingUp, Percent,
} from "lucide-react";
import {
  Expense, ExpenseCaps, ExpenseType, EXPENSES, FY, fmtINR, fmtDate, todayISO,
} from "./data";
import ExpenseSummaryCard from "./components/ExpenseSummaryCard";
import ExpenseFilters, { ExpenseFilterValues, EMPTY_EXPENSE_FILTERS } from "./components/ExpenseFilters";
import ExpenseTable from "./components/ExpenseTable";
import ExpenseDetailsDrawer from "./components/ExpenseDetailsDrawer";
import ExpenseForm from "./components/ExpenseForm";

const todayStr = new Date().toISOString().slice(0, 10);

export default function ExpenseRegisterClient({ caps, currentUser }: { caps: ExpenseCaps; currentUser: string }) {
  const [expenses, setExpenses] = useState<Expense[]>(EXPENSES);
  const [filters, setFilters] = useState<ExpenseFilterValues>(EMPTY_EXPENSE_FILTERS);
  const [drawer, setDrawer] = useState<Expense | null>(null);
  const [form, setForm] = useState<null | { initial: Expense | null; presetType?: ExpenseType }>(null);
  const [toast, setToast] = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2200); }

  // Scope by role (Employee sees own only)
  const scoped = useMemo(() => caps.scope === "all"
    ? expenses
    : expenses.filter((e) => e.createdBy === currentUser || e.employee === currentUser), [expenses, caps.scope, currentUser]);

  // Existing customer expenses (for profitability)
  const existingByCustomer = (c: string) => expenses.filter((e) => e.customer === c).reduce((s, e) => s + e.totalAmount, 0);

  // ── Summary metrics ──
  const m = useMemo(() => {
    const month = scoped.filter((e) => new Date(e.date + "T00:00:00").getMonth() === 5);
    return {
      totalMonth: month.reduce((s, e) => s + e.totalAmount, 0),
      today: scoped.filter((e) => e.date === todayStr).reduce((s, e) => s + e.totalAmount, 0),
      pendingAmt: scoped.filter((e) => e.approvalStatus === "Pending Approval").reduce((s, e) => s + e.totalAmount, 0),
      approvedAmt: scoped.filter((e) => e.approvalStatus === "Approved" || e.approvalStatus === "Paid").reduce((s, e) => s + e.totalAmount, 0),
      claimsPending: scoped.filter((e) => e.type === "Employee Expense" && e.approvalStatus === "Pending Approval").length,
      customerExp: scoped.filter((e) => e.type === "Customer Expense").reduce((s, e) => s + e.totalAmount, 0),
      gstInput: scoped.reduce((s, e) => s + e.gstAmount, 0),
    };
  }, [scoped]);

  const BUDGET = 1500000;
  const budgetPct = Math.min(100, Math.round((m.totalMonth / BUDGET) * 100));

  // ── Apply filters ──
  const filtered = useMemo(() => scoped.filter((e) => {
    const f = filters;
    if (f.dateFrom && e.date < f.dateFrom) return false;
    if (f.dateTo && e.date > f.dateTo) return false;
    if (f.branch && e.branch !== f.branch) return false;
    if (f.department && e.department !== f.department) return false;
    if (f.type && e.type !== f.type) return false;
    if (f.category && e.category !== f.category) return false;
    if (f.subCategory && e.subCategory !== f.subCategory) return false;
    if (f.paymentMode && e.paymentMode !== f.paymentMode) return false;
    if (f.status && e.approvalStatus !== f.status) return false;
    if (f.customer && !e.customer.toLowerCase().includes(f.customer.toLowerCase())) return false;
    if (f.vendor && !e.vendor.toLowerCase().includes(f.vendor.toLowerCase())) return false;
    if (f.employee && !e.employee.toLowerCase().includes(f.employee.toLowerCase())) return false;
    if (f.project && !e.project.toLowerCase().includes(f.project.toLowerCase())) return false;
    if (f.gstApplicable === "yes" && !e.gstApplicable) return false;
    if (f.gstApplicable === "no" && e.gstApplicable) return false;
    if (f.billAvailable === "yes" && !e.billAvailable) return false;
    if (f.billAvailable === "no" && e.billAvailable) return false;
    if (f.voucherGenerated === "yes" && !e.voucherGenerated) return false;
    if (f.voucherGenerated === "no" && e.voucherGenerated) return false;
    return true;
  }), [scoped, filters]);

  // ── Mini analytics ──
  const analytics = useMemo(() => {
    const group = (key: (e: Expense) => string) => {
      const map: Record<string, number> = {};
      for (const e of scoped) { const k = key(e); if (!k) continue; map[k] = (map[k] ?? 0) + e.totalAmount; }
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    const months: Record<string, number> = {};
    for (const e of scoped) { const mo = new Date(e.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" }); months[mo] = (months[mo] ?? 0) + e.totalAmount; }
    return {
      byCategory: group((e) => e.category),
      byEmployee: group((e) => e.employee),
      byCustomer: group((e) => e.customer),
      monthly: Object.entries(months),
    };
  }, [scoped]);

  // ── Mutations ──
  function applyDecision(ids: number[], status: Expense["approvalStatus"]) {
    setExpenses((xs) => xs.map((e) => ids.includes(e.id) ? { ...e, approvalStatus: status, paymentStatus: status === "Paid" ? "Paid" : e.paymentStatus, modifiedBy: currentUser } : e));
    setDrawer((d) => d && ids.includes(d.id) ? { ...d, approvalStatus: status } : d);
  }
  function onBulk(action: "approve" | "voucher" | "paid", ids: number[]) {
    if (ids.length === 0) return;
    if (action === "approve") { applyDecision(ids, "Approved"); flash(`${ids.length} approved`); }
    else if (action === "paid") { applyDecision(ids, "Paid"); flash(`${ids.length} marked paid`); }
    else { setExpenses((xs) => xs.map((e) => ids.includes(e.id) ? { ...e, voucherGenerated: true, voucherNo: e.voucherNo || `CI/${FY}/${String(20 + e.id).padStart(5, "0")}` } : e)); flash(`Vouchers generated for ${ids.length}`); }
  }
  function saveExpense(data: Omit<Expense, "id" | "expenseNo" | "approvalHistory">, submit: boolean) {
    if (form?.initial) {
      const id = form.initial.id;
      setExpenses((xs) => xs.map((e) => e.id === id ? { ...e, ...data, id, expenseNo: e.expenseNo, approvalHistory: e.approvalHistory } : e));
      flash("Expense updated");
    } else {
      const id = Math.max(0, ...expenses.map((e) => e.id)) + 1;
      setExpenses((xs) => [...xs, { ...data, id, expenseNo: `EXP/${FY}/${String(id).padStart(4, "0")}`, approvalHistory: [{ stage: "Created", by: currentUser, date: todayISO(), state: "done" }] }]);
      flash(submit ? "Expense submitted" : "Draft saved");
    }
    setForm(null);
  }

  function exportData(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Expense No", "Type", "Category", "Description", "Customer", "Vendor", "Employee", "Amount", "GST", "Total", "Status"];
      const body = filtered.map((e) => [fmtDate(e.date), e.expenseNo, e.type, e.category, e.description, e.customer, e.vendor, e.employee, e.baseAmount, e.gstAmount, e.totalAmount, e.approvalStatus]);
      const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ExpenseRegister.xls"; a.click(); URL.revokeObjectURL(a.href);
    } else {
      const rowsHtml = filtered.map((e) => `<tr><td>${fmtDate(e.date)}</td><td>${e.expenseNo}</td><td>${e.category}</td><td>${e.description}</td><td style="text-align:right">${fmtINR(e.totalAmount)}</td><td>${e.approvalStatus}</td></tr>`).join("");
      const html = `<!doctype html><html><head><title>Expense Register</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Expense Register — FY ${FY}</h1><table><thead><tr><th>Date</th><th>Expense No</th><th>Category</th><th>Description</th><th style="text-align:right">Total</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }
  }

  const maxCat = Math.max(...analytics.byCategory.map(([, v]) => v), 1);
  const maxMonthly = Math.max(...analytics.monthly.map(([, v]) => v), 1);

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-primary" onClick={() => setForm({ initial: null, presetType: "General Expense" })}><Plus size={14} /> Add Expense</button>
        <button className="btn-cav btn-cav-secondary" onClick={() => setForm({ initial: null, presetType: "Customer Expense" })}><Users size={14} /> Customer Expense</button>
        <button className="btn-cav btn-cav-secondary" onClick={() => setForm({ initial: null, presetType: "Employee Expense" })}><UserPlus size={14} /> Employee Claim</button>
        <button className="btn-cav btn-cav-secondary" onClick={() => flash("Import wizard — coming soon")}><Upload size={14} /> Import</button>
        {caps.canExport && <button className="btn-cav btn-cav-secondary" onClick={() => exportData("excel")}><FileSpreadsheet size={14} /> Excel</button>}
        {caps.canExport && <button className="btn-cav btn-cav-secondary" onClick={() => exportData("pdf")}><FileText size={14} /> PDF</button>}
      </div>

      {/* Filters (collapsible, top) */}
      <ExpenseFilters value={filters} onApply={setFilters} onReset={() => setFilters(EMPTY_EXPENSE_FILTERS)} onSaveView={() => flash("Filter view saved")} />

      {/* Summary cards (8) */}
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Total Expenses (Month)" value={m.totalMonth} icon={Receipt} accent />
        <ExpenseSummaryCard label="Today's Expenses" value={m.today} icon={CalendarDays} sub={todayStr} />
        <ExpenseSummaryCard label="Pending Approval" value={m.pendingAmt} icon={Clock} tone="warn" />
        <ExpenseSummaryCard label="Approved Expenses" value={m.approvedAmt} icon={CheckCircle2} tone="credit" />
        <ExpenseSummaryCard label="Employee Claims Pending" value={m.claimsPending} money={false} icon={Wallet} sub="claims" />
        <ExpenseSummaryCard label="Customer Expenses" value={m.customerExp} icon={Users} />
        <ExpenseSummaryCard label="GST Input" value={m.gstInput} icon={Percent} tone="credit" />
        <ExpenseSummaryCard label="Budget Utilization" value={`${budgetPct}%`} money={false} icon={TrendingUp} sub={`${fmtINR(m.totalMonth)} / ${fmtINR(BUDGET)}`} accent />
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} /> Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b> ({caps.scope === "own" ? "own expenses" : "all expenses"}) · illustrative data.
      </div>

      {/* Table OR empty state */}
      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Receipt size={36} strokeWidth={1.2} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-3)", marginTop: 10 }}>No expenses recorded</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Add your first expense or import a batch.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => setForm({ initial: null })}><Plus size={13} /> Add First Expense</button>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => flash("Import wizard — coming soon")}><Upload size={13} /> Import Expense</button>
            </div>
          </div>
        </div>
      ) : (
        <ExpenseTable rows={filtered} caps={caps} onRowClick={setDrawer} onExport={exportData} onBulk={onBulk} />
      )}

      {/* Reports quick view */}
      <div className="grid-12">
        <div className="col-6"><MiniBars title="Category-wise Expense" rows={analytics.byCategory} max={maxCat} /></div>
        <div className="col-6"><MiniBars title="Customer-wise Expense" rows={analytics.byCustomer} max={Math.max(...analytics.byCustomer.map(([, v]) => v), 1)} /></div>
        <div className="col-6"><MiniBars title="Employee-wise Expense" rows={analytics.byEmployee} max={Math.max(...analytics.byEmployee.map(([, v]) => v), 1)} /></div>
        <div className="col-6"><MiniBars title="Monthly Trend" rows={analytics.monthly} max={maxMonthly} accent /></div>
      </div>

      {/* Drawer */}
      {drawer && (
        <ExpenseDetailsDrawer expense={drawer} caps={caps} customerExisting={existingByCustomer(drawer.customer)}
          onClose={() => setDrawer(null)}
          onEdit={(e) => { setDrawer(null); setForm({ initial: e }); }}
          onApprove={(id) => { applyDecision([id], "Approved"); flash("Approved"); }}
          onReject={(id) => { applyDecision([id], "Rejected"); flash("Rejected"); }} />
      )}

      {/* Form */}
      {form && (
        <ExpenseForm
          initial={form.initial} presetType={form.presetType}
          currentUser={currentUser} existingByCustomer={existingByCustomer}
          onClose={() => setForm(null)} onSave={saveExpense} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--cyber-black)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 999, boxShadow: "var(--shadow-lg)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

// ─── Mini horizontal-bar analytics card ───────────────────────────────────────

function MiniBars({ title, rows, max, accent }: { title: string; rows: [string, number][]; max: number; accent?: boolean }) {
  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header"><div className="ch-title">{title}</div></div>
      <div className="card-body">
        {rows.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--fg-4)", padding: "8px 0" }}>No data.</div>
        ) : rows.map(([label, value]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
            <div style={{ width: 110, fontSize: 11.5, color: "var(--fg-2)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
            <div style={{ flex: 1, height: 10, background: "var(--bg-muted)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: accent ? "var(--infra-blue)" : "var(--caveo-red)", borderRadius: 5 }} />
            </div>
            <div style={{ width: 64, fontSize: 11.5, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
