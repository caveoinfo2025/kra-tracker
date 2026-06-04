"use client";

/**
 * Expense Categories — orchestrator (Phase 2, UI only).
 * Configuration-driven category engine used by expense register,
 * claims, advances, conveyance, customers, GST reporting, Tally export.
 */

import { useMemo, useState } from "react";
import {
  Plus, FolderPlus, Upload, FileSpreadsheet, Tag, Info, CheckCircle2,
  LayoutGrid, Percent, ShieldCheck, Users,
} from "lucide-react";
import {
  ExpenseCategory, CatCaps, CategoryTemplate,
  CATEGORIES as MOCK_CATEGORIES, catStats, statusBadge, getParentName,
  enabledUsages, USAGE_SHORT, fmtDate, todayISO,
} from "./data";
import CategoryFilters, { CatFilterValues, EMPTY_CAT_FILTERS } from "./components/CategoryFilters";
import CategoryTable from "./components/CategoryTable";
import CategoryForm from "./components/CategoryForm";
import CategoryDrawer from "./components/CategoryDrawer";
import CategoryTemplateLoader from "./components/CategoryTemplateLoader";

// Re-use ExpenseSummaryCard from the parent Expense module.
import ExpenseSummaryCard from "../components/ExpenseSummaryCard";

export default function ExpenseCategoriesClient({
  caps,
  currentUser,
}: {
  caps: CatCaps;
  currentUser: string;
}) {
  const [cats, setCats] = useState<ExpenseCategory[]>(MOCK_CATEGORIES);
  const [filters, setFilters] = useState<CatFilterValues>(EMPTY_CAT_FILTERS);
  const [drawer, setDrawer] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<{ initial: ExpenseCategory | null; presetParentId?: number | null } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2400); }

  // ── Stats ──
  const stats = useMemo(() => catStats(cats), [cats]);
  const parents = useMemo(() => cats.filter((c) => c.parentId === null), [cats]);
  const nextId = useMemo(() => Math.max(0, ...cats.map((c) => c.id)) + 1, [cats]);

  // ── Filter ──
  const filtered = useMemo(() => cats.filter((c) => {
    const f = filters;
    if (f.status && c.status !== f.status) return false;
    if (f.parentId && String(c.parentId) !== f.parentId) return false;
    if (f.usageKey && !c[f.usageKey as keyof ExpenseCategory]) return false;
    if (f.gstApplicable === "yes" && !c.gstEnabled) return false;
    if (f.gstApplicable === "no" && c.gstEnabled) return false;
    if (f.approvalRequired === "yes" && !c.approvalRequired) return false;
    if (f.approvalRequired === "no" && c.approvalRequired) return false;
    if (f.customerEnabled === "yes" && !c.customerTrackingEnabled) return false;
    if (f.customerEnabled === "no" && c.customerTrackingEnabled) return false;
    if (f.employeeEnabled === "yes" && !c.forEmployee) return false;
    if (f.employeeEnabled === "no" && c.forEmployee) return false;
    return true;
  }), [cats, filters]);

  // ── Mutations ──
  function saveCategory(cat: ExpenseCategory) {
    if (form?.initial) {
      setCats((xs) => xs.map((c) => c.id === cat.id ? cat : c));
      flash(`"${cat.name}" updated`);
    } else {
      setCats((xs) => [...xs, cat]);
      flash(`"${cat.name}" created`);
    }
    setForm(null);
  }

  function disableCategories(ids: number[]) {
    const now = todayISO();
    setCats((xs) => xs.map((c) => ids.includes(c.id)
      ? { ...c, status: "Inactive", modifiedBy: currentUser, modifiedAt: now, auditHistory: [...c.auditHistory, { action: "Disabled", by: currentUser, at: now }] }
      : c
    ));
    flash(`${ids.length} categor${ids.length > 1 ? "ies" : "y"} disabled`);
    setDrawer(null);
  }

  function cloneCategory(cat: ExpenseCategory) {
    const clonedName = `${cat.name} (Copy)`;
    const clonedCode = `${cat.code}-CP`;
    const now = todayISO();
    const cloned: ExpenseCategory = {
      ...cat,
      id: nextId,
      name: clonedName,
      code: clonedCode,
      createdBy: currentUser,
      createdAt: now,
      modifiedBy: undefined,
      modifiedAt: undefined,
      auditHistory: [{ action: "Cloned from " + cat.code, by: currentUser, at: now }],
    };
    setCats((xs) => [...xs, cloned]);
    flash(`Cloned as "${clonedName}"`);
    setDrawer(null);
  }

  function loadTemplate(template: CategoryTemplate) {
    const now = todayISO();
    const existingCodes = new Set(cats.map((c) => c.code));
    const toAdd: ExpenseCategory[] = [];

    let id = nextId;

    // Add parent if not already present
    if (!existingCodes.has(template.parentCode)) {
      const parent: ExpenseCategory = {
        id: id++,
        code: template.parentCode,
        name: template.parentName,
        description: "",
        parentId: null,
        status: "Active",
        createdBy: currentUser,
        createdAt: now,
        auditHistory: [{ action: "Loaded from template", by: currentUser, at: now }],
        forGeneral: true, forCustomer: false, forEmployee: false,
        forAdvanceSettlement: false, forConveyance: false, forVendor: false,
        allowedPaymentModes: ["Cash", "Bank Transfer", "UPI", "Cheque", "Corporate Card"],
        billRequired: "amount_based", billAmountThreshold: 500,
        allowedAttachments: ["Image", "PDF"],
        gstEnabled: false, gstRate: 18, gstType: "services", inputCreditEligible: false,
        approvalRequired: false, approvalRule: "amount_based", approvalThreshold: 5000, approvers: ["Manager"],
        hrRulesEnabled: false, gradePolicies: [],
        customerTrackingEnabled: false, allowLinkCustomer: false, allowLinkProject: false,
        allowLinkSalesOrder: false, allowLinkTicket: false,
        tallyLedger: template.tallyLedger, tallyCostCenterRequired: false,
        tallyGSTLedger: "", tallyExportEnabled: true,
      };
      toAdd.push(parent);
    }

    const parentCat = [...cats, ...toAdd].find((c) => c.code === template.parentCode);
    const parentId = parentCat?.id ?? (toAdd[0]?.id ?? null);

    // Add sub-categories
    for (const sub of template.subCategories) {
      if (!existingCodes.has(sub.code)) {
        toAdd.push({
          id: id++,
          code: sub.code,
          name: sub.name,
          description: "",
          parentId,
          status: "Active",
          createdBy: currentUser,
          createdAt: now,
          auditHistory: [{ action: "Loaded from template", by: currentUser, at: now }],
          forGeneral: true, forCustomer: false, forEmployee: false,
          forAdvanceSettlement: false, forConveyance: false, forVendor: false,
          allowedPaymentModes: ["Cash", "Bank Transfer", "UPI", "Cheque", "Corporate Card"],
          billRequired: "amount_based", billAmountThreshold: 500,
          allowedAttachments: ["Image", "PDF"],
          gstEnabled: false, gstRate: 18, gstType: "services", inputCreditEligible: false,
          approvalRequired: false, approvalRule: "amount_based", approvalThreshold: 5000, approvers: ["Manager"],
          hrRulesEnabled: false, gradePolicies: [],
          customerTrackingEnabled: false, allowLinkCustomer: false, allowLinkProject: false,
          allowLinkSalesOrder: false, allowLinkTicket: false,
          tallyLedger: template.tallyLedger, tallyCostCenterRequired: false,
          tallyGSTLedger: "", tallyExportEnabled: true,
        });
      }
    }

    if (toAdd.length > 0) {
      setCats((xs) => [...xs, ...toAdd]);
      flash(`Loaded ${toAdd.length} categories from "${template.parentName}" template`);
    } else {
      flash(`All categories from "${template.parentName}" already exist`);
    }
  }

  const isEmpty = filtered.length === 0;

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {caps.canCreate && (
          <>
            <button className="btn-cav btn-cav-primary" onClick={() => setForm({ initial: null })}>
              <Plus size={14} /> Add Category
            </button>
            <button className="btn-cav btn-cav-secondary" onClick={() => setForm({ initial: null, presetParentId: parents[0]?.id ?? null })}>
              <FolderPlus size={14} /> Add Sub Category
            </button>
            <button className="btn-cav btn-cav-secondary" onClick={() => setShowTemplates(true)}>
              <LayoutGrid size={14} /> Load Default Templates
            </button>
          </>
        )}
        <button className="btn-cav btn-cav-secondary" onClick={() => flash("Import — coming soon")}>
          <Upload size={14} /> Import
        </button>
        {caps.canExport && (
          <button className="btn-cav btn-cav-secondary" onClick={() => flash("Exported")}>
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        )}
      </div>

      {/* Filters (collapsible, top) */}
      <CategoryFilters
        value={filters}
        parents={parents}
        onApply={setFilters}
        onReset={() => setFilters(EMPTY_CAT_FILTERS)}
      />

      {/* Summary KPIs (6) */}
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Total Categories" value={stats.total} money={false} icon={Tag} accent />
        <ExpenseSummaryCard label="Active Categories" value={stats.active} money={false} icon={CheckCircle2} tone="credit" />
        <ExpenseSummaryCard label="Sub Categories" value={stats.subCategories} money={false} icon={FolderPlus} />
        <ExpenseSummaryCard label="GST Enabled" value={stats.gstEnabled} money={false} icon={Percent} />
        <ExpenseSummaryCard label="Approval Controlled" value={stats.approvalRequired} money={false} icon={ShieldCheck} tone="warn" />
        <ExpenseSummaryCard label="Customer Expense" value={stats.customerEnabled} money={false} icon={Users} />
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} /> Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b>
        {!caps.canCreate && " · View only"} · illustrative data
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <Tag size={40} strokeWidth={1.2} style={{ color: "var(--fg-4)", opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)", marginTop: 10 }}>
              No expense categories configured
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg-4)", marginTop: 4, maxWidth: 360, margin: "6px auto 0" }}>
              Create your first category to start classifying expenses for reports, approvals, and Tally export.
            </div>
            {caps.canCreate && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
                <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => setForm({ initial: null })}>
                  <Plus size={13} /> Create Category
                </button>
                <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setShowTemplates(true)}>
                  <LayoutGrid size={13} /> Load Default Template
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CategoryTable
          rows={filtered}
          allCats={cats}
          caps={caps}
          onView={setDrawer}
          onEdit={(c) => setForm({ initial: c })}
          onDisable={disableCategories}
          onAddSub={(parent) => setForm({ initial: null, presetParentId: parent.id })}
        />
      )}

      {/* Detail drawer */}
      {drawer && (
        <CategoryDrawer
          cat={drawer}
          caps={caps}
          onClose={() => setDrawer(null)}
          onEdit={(c) => { setDrawer(null); setForm({ initial: c }); }}
          onDisable={disableCategories}
          onClone={cloneCategory}
        />
      )}

      {/* Create / edit form */}
      {form && (
        <CategoryForm
          initial={form.initial}
          presetParentId={form.presetParentId}
          caps={caps}
          currentUser={currentUser}
          nextId={nextId}
          onClose={() => setForm(null)}
          onSave={saveCategory}
        />
      )}

      {/* Template loader */}
      {showTemplates && (
        <CategoryTemplateLoader
          onClose={() => setShowTemplates(false)}
          onLoad={loadTemplate}
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
