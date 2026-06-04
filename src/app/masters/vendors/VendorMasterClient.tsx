"use client";

/**
 * Vendor Master — global CRM master orchestrator (UI-only, mock data).
 * Single source of truth for vendor information across Finance, Procurement,
 * Inventory, Projects, Support, AMC, Assets, and Tally Export.
 */

import { useMemo, useState } from "react";
import {
  Plus, Upload, FileSpreadsheet, Store, CheckCircle2, Info, Search,
  GitBranch, ShieldCheck, Building2, BadgeCheck,
} from "lucide-react";
import {
  Vendor, VendorCaps, VENDORS as MOCK_VENDORS, vendorStats, statusBadge, todayISO,
} from "./data";
import VendorFilters, { VendorFilterValues, EMPTY_VENDOR_FILTERS } from "./components/VendorFilters";
import VendorTable from "./components/VendorTable";
import VendorForm from "./components/VendorForm";
import VendorProfile from "./components/VendorProfile";

// Reuse the finance KPI card
import ExpenseSummaryCard from "../../finance/expenses/components/ExpenseSummaryCard";

export default function VendorMasterClient({
  caps,
  currentUser,
}: {
  caps: VendorCaps;
  currentUser: string;
}) {
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [filters, setFilters] = useState<VendorFilterValues>(EMPTY_VENDOR_FILTERS);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<Vendor | null>(null);
  const [form, setForm] = useState<{ initial: Vendor | null } | null>(null);
  const [toast, setToast] = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2400); }

  const stats = useMemo(() => vendorStats(vendors), [vendors]);
  const nextId = useMemo(() => Math.max(0, ...vendors.map((v) => v.id)) + 1, [vendors]);

  // Apply filters
  const filtered = useMemo(() => vendors.filter((v) => {
    const f = filters;
    if (f.status && v.status !== f.status) return false;
    if (f.vendorType && v.vendorType !== f.vendorType) return false;
    if (f.companyType && v.companyType !== f.companyType) return false;
    if (f.state) {
      const pb = v.branches.find((b) => b.isPrimary) ?? v.branches[0];
      if (!pb || pb.state !== f.state) return false;
    }
    if (f.msme === "yes" && !v.msmeRegistered) return false;
    if (f.msme === "no" && v.msmeRegistered) return false;
    if (f.gstStatus) {
      const hasGst = v.branches.some((b) => b.gstStatus === f.gstStatus);
      if (!hasGst) return false;
    }
    return true;
  }), [vendors, filters]);

  // Mutations
  function saveVendor(v: Vendor) {
    if (form?.initial) {
      setVendors((xs) => xs.map((x) => x.id === v.id ? v : x));
      if (profile?.id === v.id) setProfile(v);
      flash(`"${v.legalName}" updated`);
    } else {
      setVendors((xs) => [...xs, v]);
      flash(`"${v.legalName}" added to Vendor Master`);
    }
    setForm(null);
  }

  function disableVendors(ids: number[]) {
    const now = todayISO();
    setVendors((xs) => xs.map((v) => ids.includes(v.id)
      ? { ...v, status: "Inactive", modifiedBy: currentUser, modifiedAt: now, auditHistory: [...v.auditHistory, { action: "Disabled", by: currentUser, at: now }] }
      : v
    ));
    if (profile && ids.includes(profile.id)) setProfile(null);
    flash(`${ids.length} vendor${ids.length > 1 ? "s" : ""} disabled`);
  }

  function updateVendor(v: Vendor) {
    setVendors((xs) => xs.map((x) => x.id === v.id ? v : x));
    setProfile(v);
  }

  const isEmpty = filtered.length === 0 && !search;

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {caps.canCreate && (
          <button className="btn-cav btn-cav-primary" onClick={() => setForm({ initial: null })}>
            <Plus size={14} /> Add Vendor
          </button>
        )}
        <button className="btn-cav btn-cav-secondary" onClick={() => flash("Import wizard — coming soon")}>
          <Upload size={14} /> Import Vendors
        </button>
        {caps.canExport && (
          <button className="btn-cav btn-cav-secondary" onClick={() => flash("Exported")}>
            <FileSpreadsheet size={14} /> Export List
          </button>
        )}
      </div>

      {/* Filters (collapsible) */}
      <VendorFilters value={filters} onApply={setFilters} onReset={() => setFilters(EMPTY_VENDOR_FILTERS)} />

      {/* Summary KPIs */}
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Total Vendors" value={stats.total} money={false} icon={Store} accent />
        <ExpenseSummaryCard label="Active Vendors" value={stats.active} money={false} icon={CheckCircle2} tone="credit" />
        <ExpenseSummaryCard label="GST Registered" value={stats.gstRegistered} money={false} icon={BadgeCheck} />
        <ExpenseSummaryCard label="Multi-Branch" value={stats.multiBranch} money={false} icon={GitBranch} />
        <ExpenseSummaryCard label="MSME Vendors" value={stats.msme} money={false} icon={ShieldCheck} />
        <ExpenseSummaryCard label="Pending Verification" value={stats.pendingVerification} money={false} icon={Building2} tone="warn" />
      </div>

      {/* Global search bar */}
      <div className="tb-search" style={{ maxWidth: 400 }}>
        <Search size={14} className="tb-search-icon" />
        <input
          className="tb-search-input"
          placeholder="Search vendors by name, code, PAN, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} /> Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b>
        {!caps.canCreate && " · View only"} · illustrative data · Global master used by Finance, Procurement, Projects
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <Store size={40} strokeWidth={1.2} style={{ color: "var(--fg-4)", opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)", marginTop: 10 }}>No vendors configured</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-4)", marginTop: 4 }}>Add your first vendor to start tracking expenses, POs, and payments.</div>
            {caps.canCreate && (
              <button className="btn-cav btn-cav-primary btn-cav-sm" style={{ marginTop: 18 }} onClick={() => setForm({ initial: null })}>
                <Plus size={13} /> Add First Vendor
              </button>
            )}
          </div>
        </div>
      ) : (
        <VendorTable
          rows={filtered}
          caps={caps}
          search={search}
          onView={setProfile}
          onEdit={(v) => setForm({ initial: v })}
          onDisable={disableVendors}
        />
      )}

      {/* Profile drawer */}
      {profile && (
        <VendorProfile
          vendor={profile}
          caps={caps}
          onClose={() => setProfile(null)}
          onEdit={(v) => setForm({ initial: v })}
          onDisable={disableVendors}
          onChange={updateVendor}
        />
      )}

      {/* Create / edit form */}
      {form && (
        <VendorForm
          initial={form.initial}
          caps={caps}
          currentUser={currentUser}
          allVendors={vendors}
          nextId={nextId}
          onClose={() => setForm(null)}
          onSave={saveVendor}
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
