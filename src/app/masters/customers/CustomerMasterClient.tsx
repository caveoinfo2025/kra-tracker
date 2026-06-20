"use client";

/**
 * Global Customer Master — enterprise orchestrator (UI-only, mock data).
 * Single source of truth referenced across CRM Sales, Opportunities, Quotations,
 * Orders, Projects, Support, AMC, Assets, Finance, Profitability, Engineer Visits.
 *
 * Extends the existing `Customer` model conceptually — no duplicate model, no schema
 * changes. Backend wiring (to the existing Customer table) is a later phase.
 *
 * Preview-only mock data retained for reference. Do not use for production
 * Customer Master rendering. As of Step 2P, ../page.tsx no longer imports this
 * component — /masters/customers renders the real, Prisma-backed
 * @/app/customers/CustomerMasterClient instead (same one /customers uses).
 * This file's richer enterprise schema (multi-site, contacts, commercial,
 * assets, profitability, 12-tab profile) is the target contract for a future
 * backend-wiring phase, not yet implemented against the live `Customer` table.
 */

import { useMemo, useState } from "react";
import {
  Plus, Upload, FileSpreadsheet, Building2, CheckCircle2, Info, Search,
  MapPin, BadgeCheck, ShieldCheck, Crown,
} from "lucide-react";
import {
  Customer, CustomerCaps, CUSTOMERS as MOCK_CUSTOMERS,
  customerStats, todayISO,
} from "./data";
import CustomerFilters, { CustomerFilterValues, EMPTY_CUSTOMER_FILTERS } from "./components/CustomerFilters";
import CustomerTable from "./components/CustomerTable";
import CustomerForm from "./components/CustomerForm";
import CustomerProfile from "./components/CustomerProfile";

// Reuse the finance KPI card (cross-module reuse)
import ExpenseSummaryCard from "../../finance/expenses/components/ExpenseSummaryCard";

export default function CustomerMasterClient({
  caps, currentUser,
}: {
  caps: CustomerCaps;
  currentUser: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [filters, setFilters] = useState<CustomerFilterValues>(EMPTY_CUSTOMER_FILTERS);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<Customer | null>(null);
  const [form, setForm] = useState<{ initial: Customer | null } | null>(null);
  const [toast, setToast] = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2400); }

  const stats = useMemo(() => customerStats(customers), [customers]);
  const nextId = useMemo(() => Math.max(0, ...customers.map((c) => c.id)) + 1, [customers]);

  const filtered = useMemo(() => customers.filter((c) => {
    const f = filters;
    if (f.status && c.status !== f.status) return false;
    if (f.customerType && c.customerType !== f.customerType) return false;
    if (f.industry && c.industry !== f.industry) return false;
    if (f.state) {
      const ps = c.sites.find((s) => s.isPrimary) ?? c.sites[0];
      if (!ps || ps.state !== f.state) return false;
    }
    if (f.gstStatus && !c.sites.some((s) => s.gstStatus === f.gstStatus)) return false;
    if (f.amc === "yes" && !c.hasActiveAMC) return false;
    if (f.amc === "no" && c.hasActiveAMC) return false;
    return true;
  }), [customers, filters]);

  function saveCustomer(c: Customer) {
    if (form?.initial) {
      setCustomers((xs) => xs.map((x) => x.id === c.id ? c : x));
      if (profile?.id === c.id) setProfile(c);
      flash(`"${c.legalName}" updated`);
    } else {
      setCustomers((xs) => [...xs, c]);
      flash(`"${c.legalName}" added to Customer Master`);
    }
    setForm(null);
  }

  function disableCustomers(ids: number[]) {
    const now = todayISO();
    setCustomers((xs) => xs.map((c) => ids.includes(c.id)
      ? { ...c, status: "Inactive", modifiedBy: currentUser, modifiedAt: now, auditHistory: [...c.auditHistory, { action: "Disabled", by: currentUser, at: now }] }
      : c
    ));
    if (profile && ids.includes(profile.id)) setProfile(null);
    flash(`${ids.length} customer${ids.length > 1 ? "s" : ""} disabled`);
  }

  function updateCustomer(c: Customer) {
    setCustomers((xs) => xs.map((x) => x.id === c.id ? c : x));
    setProfile(c);
  }

  const isEmpty = filtered.length === 0 && !search;

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {caps.canCreate && (
          <button className="btn-cav btn-cav-primary" onClick={() => setForm({ initial: null })}>
            <Plus size={14} /> Add Customer
          </button>
        )}
        <button className="btn-cav btn-cav-secondary" onClick={() => flash("Import wizard — coming soon")}>
          <Upload size={14} /> Import Customers
        </button>
        {caps.canExport && (
          <button className="btn-cav btn-cav-secondary" onClick={() => flash("Exported")}>
            <FileSpreadsheet size={14} /> Export List
          </button>
        )}
      </div>

      {/* Filters */}
      <CustomerFilters value={filters} onApply={setFilters} onReset={() => setFilters(EMPTY_CUSTOMER_FILTERS)} />

      {/* Summary KPIs */}
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Total Customers" value={stats.total} money={false} icon={Building2} accent />
        <ExpenseSummaryCard label="Active Customers" value={stats.active} money={false} icon={CheckCircle2} tone="credit" />
        <ExpenseSummaryCard label="Customer Sites" value={stats.sites} money={false} icon={MapPin} />
        <ExpenseSummaryCard label="GST Registered" value={stats.gstRegistered} money={false} icon={BadgeCheck} />
        <ExpenseSummaryCard label="Active AMC" value={stats.activeAMC} money={false} icon={ShieldCheck} tone="credit" />
        <ExpenseSummaryCard label="High Value" value={stats.highValue} money={false} icon={Crown} tone="warn" />
      </div>

      {/* Global search */}
      <div className="tb-search" style={{ maxWidth: 400 }}>
        <Search size={14} className="tb-search-icon" />
        <input className="tb-search-input" placeholder="Search customers by name, code, PAN, city, owner…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} /> Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b>
        {!caps.canCreate && " · View/limited"} · illustrative data · Global master used by Sales, Projects, Support, Finance
      </div>

      {/* Empty state / table */}
      {isEmpty ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <Building2 size={40} strokeWidth={1.2} style={{ color: "var(--fg-4)", opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)", marginTop: 10 }}>No customers configured</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-4)", marginTop: 4 }}>Add your first customer to start tracking sites, GST, opportunities, and profitability.</div>
            {caps.canCreate && (
              <button className="btn-cav btn-cav-primary btn-cav-sm" style={{ marginTop: 18 }} onClick={() => setForm({ initial: null })}>
                <Plus size={13} /> Add First Customer
              </button>
            )}
          </div>
        </div>
      ) : (
        <CustomerTable
          rows={filtered}
          allCustomers={customers}
          caps={caps}
          search={search}
          onView={setProfile}
          onEdit={(c) => setForm({ initial: c })}
          onDisable={disableCustomers}
        />
      )}

      {/* Profile */}
      {profile && (
        <CustomerProfile
          customer={profile}
          allCustomers={customers}
          caps={caps}
          onClose={() => setProfile(null)}
          onEdit={(c) => setForm({ initial: c })}
          onDisable={disableCustomers}
          onChange={updateCustomer}
          onSelect={(c) => setProfile(c)}
        />
      )}

      {/* Form */}
      {form && (
        <CustomerForm
          initial={form.initial}
          caps={caps}
          currentUser={currentUser}
          allCustomers={customers}
          nextId={nextId}
          onClose={() => setForm(null)}
          onSave={saveCustomer}
        />
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
