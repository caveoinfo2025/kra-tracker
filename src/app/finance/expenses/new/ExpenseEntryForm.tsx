"use client";

/**
 * Expense Entry form — Phase 2 (UI only, no backend).
 *
 * Reuses the existing CRM form conventions: input/label classes, the brand-red
 * focus ring, `CustomerNameCombobox`, `.card` section shells, and `.btn-cav`
 * buttons. All sections are dynamic (driven by expense type, invoice toggle,
 * and GST applicability) and validated client-side. Save Draft / Submit are
 * mocked — they validate and show a confirmation; no fetch is made yet.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Receipt, Store, FileText, Percent, Users, Paperclip,
  Plus, X, CheckCircle2, Image as ImageIcon, Banknote,
} from "lucide-react";
import CustomerNameCombobox from "@/components/CustomerNameCombobox";

// ─── Option sets (mock until finance APIs ship) ───────────────────────────────

const BRANCHES = ["Head Office", "Bangalore", "Chennai"];
const PAYMENT_ACCOUNTS = ["Cash — HO", "Petty Cash", "HDFC Current", "ICICI Current"];
const EXPENSE_TYPES = ["General Expense", "Customer Expense", "Employee Claim"] as const;
type ExpenseType = (typeof EXPENSE_TYPES)[number];

const CATEGORIES: Record<string, string[]> = {
  Travel: ["Air", "Train", "Cab / Taxi", "Fuel", "Toll / Parking"],
  Accommodation: ["Hotel", "Guest House", "Per Diem"],
  Meals: ["Team Meal", "Client Meal", "Self"],
  "Office Supplies": ["Stationery", "Printing", "Pantry"],
  Vehicle: ["Fuel", "Maintenance", "Insurance"],
  Communication: ["Mobile", "Internet", "Courier"],
  "Professional Services": ["Consultancy", "Legal", "Audit"],
  Other: ["Miscellaneous"],
};

const INITIAL_VENDORS = [
  "IndiGo Airlines", "Taj Hotels", "Reliance Petroleum", "Croma",
  "Airtel Business", "BluSmart Mobility", "Amazon Business",
];

const GST_RATES = [5, 12, 18, 28];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, required, error, children, full,
}: {
  label: string; required?: boolean; error?: string;
  children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelCls}>
        {label} {required && <span className="text-[#C8102E]">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[#C8102E] mt-1">{error}</p>}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, desc, children,
}: {
  title: string; icon: React.ComponentType<{ size?: number }>;
  desc?: string; children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Icon size={14} />
          </span>
          <div>
            <div className="ch-title">{title}</div>
            {desc && <div className="ch-sub">{desc}</div>}
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Attachment = { id: string; name: string; url: string; isPdf: boolean };
type Errors = Record<string, string>;

const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpenseEntryForm() {
  const router = useRouter();

  // Basic
  const [date, setDate] = useState(todayISO());
  const [branch, setBranch] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseType>("General Expense");

  // Category
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");

  // Vendor
  const [vendors, setVendors] = useState<string[]>(INITIAL_VENDORS);
  const [vendor, setVendor] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorGstin, setNewVendorGstin] = useState("");

  // Invoice
  const [invoiceAvailable, setInvoiceAvailable] = useState<"yes" | "no">("no");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  // Amount / GST
  const [amount, setAmount] = useState(""); // used when GST not applicable
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [gstType, setGstType] = useState<"intra" | "inter">("intra");
  const [gstRate, setGstRate] = useState(18);
  const [taxable, setTaxable] = useState("");
  const [cgst, setCgst] = useState("");
  const [sgst, setSgst] = useState("");
  const [igst, setIgst] = useState("");

  // Customer (Customer Expense only)
  const [customer, setCustomer] = useState("");
  const [project, setProject] = useState("");
  const [order, setOrder] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Voucher
  const [genVoucher, setGenVoucher] = useState(false);

  // Form state
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState<null | "draft" | "submit">(null);

  const isCustomerExpense = expenseType === "Customer Expense";
  const subCategories = category ? CATEGORIES[category] ?? [] : [];

  // ── GST auto-split ──────────────────────────────────────────────────────────
  function recomputeGst(nextTaxable: string, nextRate: number, nextType: "intra" | "inter") {
    const t = parseFloat(nextTaxable);
    if (isNaN(t) || t <= 0) {
      setCgst(""); setSgst(""); setIgst("");
      return;
    }
    if (nextType === "intra") {
      const half = (t * (nextRate / 100)) / 2;
      setCgst(half.toFixed(2)); setSgst(half.toFixed(2)); setIgst("");
    } else {
      const full = t * (nextRate / 100);
      setIgst(full.toFixed(2)); setCgst(""); setSgst("");
    }
  }

  const gstTotal = useMemo(() => {
    const t = parseFloat(taxable) || 0;
    const c = parseFloat(cgst) || 0;
    const s = parseFloat(sgst) || 0;
    const i = parseFloat(igst) || 0;
    return t + c + s + i;
  }, [taxable, cgst, sgst, igst]);

  const effectiveAmount = gstApplicable ? gstTotal : parseFloat(amount) || 0;

  // ── Vendor add ──────────────────────────────────────────────────────────────
  function commitNewVendor() {
    const name = newVendorName.trim();
    if (!name) return;
    if (!vendors.includes(name)) setVendors((v) => [name, ...v]);
    setVendor(name);
    setAddingVendor(false);
    setNewVendorName("");
    setNewVendorGstin("");
  }

  // ── Attachments ─────────────────────────────────────────────────────────────
  function onFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    Array.from(files).forEach((f) => {
      next.push({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        name: f.name,
        url: URL.createObjectURL(f),
        isPdf: f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      });
    });
    setAttachments((prev) => [...prev, ...next].slice(0, 5));
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  function validate(mode: "draft" | "submit"): Errors {
    const e: Errors = {};
    // Draft only needs the bare minimum to identify the entry.
    if (!date) e.date = "Date is required.";
    if (!expenseType) e.expenseType = "Select an expense type.";

    if (mode === "submit") {
      if (!branch) e.branch = "Select a branch.";
      if (!paymentAccount) e.paymentAccount = "Select a payment account.";
      if (!category) e.category = "Select a category.";
      if (subCategories.length > 0 && !subCategory) e.subCategory = "Select a sub-category.";
      if (expenseType !== "Employee Claim" && !vendor) e.vendor = "Select or add a vendor.";

      if (invoiceAvailable === "yes") {
        if (!invoiceNo.trim()) e.invoiceNo = "Invoice number is required.";
        if (!invoiceDate) e.invoiceDate = "Invoice date is required.";
      }

      if (gstApplicable) {
        if (!gstNumber.trim()) e.gstNumber = "GST number is required.";
        else if (!GSTIN_RE.test(gstNumber.trim().toUpperCase()))
          e.gstNumber = "Invalid GSTIN format.";
        if (!(parseFloat(taxable) > 0)) e.taxable = "Enter the taxable amount.";
        if (gstTotal <= 0) e.gstTotal = "Total must be greater than zero.";
      } else {
        if (!(parseFloat(amount) > 0)) e.amount = "Enter the expense amount.";
      }

      if (isCustomerExpense && !customer.trim()) e.customer = "Customer is required for a customer expense.";
    }
    return e;
  }

  function handleSave(mode: "draft" | "submit") {
    setSubmitted(null);
    const e = validate(mode);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Scroll to the top error banner
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // No backend yet — confirm the (mock) action.
    setSubmitted(mode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    router.push("/finance/expenses");
  }

  const errorCount = Object.keys(errors).length;
  const inr = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 880 }}>
      {/* Success banner (mock) */}
      {submitted && (
        <div
          className="mb-4"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#E8F5EE", color: "#1F7A3F",
            border: "1px solid #BfE3CC", borderRadius: 8, padding: "12px 16px",
          }}
        >
          <CheckCircle2 size={18} />
          <div style={{ fontSize: 13 }}>
            {submitted === "draft"
              ? "Saved as draft. (UI preview — no data is persisted yet.)"
              : "Expense submitted for approval. (UI preview — no data is persisted yet.)"}
          </div>
        </div>
      )}

      {/* Error summary */}
      {errorCount > 0 && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
          Please fix {errorCount} field{errorCount > 1 ? "s" : ""} before continuing.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── Basic ── */}
        <Section title="Basic Details" icon={CalendarDays}>
          <Field label="Date" required error={errors.date}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Branch" required error={errors.branch}>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
              <option value="">Select branch…</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Payment Account" required error={errors.paymentAccount}>
            <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} className={inputCls}>
              <option value="">Select account…</option>
              {PAYMENT_ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Expense Type" required error={errors.expenseType}>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
              className={inputCls}
            >
              {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </Section>

        {/* ── Category ── */}
        <Section title="Category" icon={Receipt}>
          <Field label="Category" required error={errors.category}>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSubCategory(""); }}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Sub Category" required={subCategories.length > 0} error={errors.subCategory}>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className={inputCls}
              disabled={!category}
            >
              <option value="">{category ? "Select sub-category…" : "Select a category first"}</option>
              {subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        {/* ── Vendor ── */}
        <Section title="Vendor" icon={Store} desc={expenseType === "Employee Claim" ? "Optional for employee claims." : undefined}>
          <Field label="Vendor" required={expenseType !== "Employee Claim"} error={errors.vendor}>
            <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputCls}>
              <option value="">Select vendor…</option>
              {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            {!addingVendor ? (
              <button
                type="button"
                className="btn-cav btn-cav-secondary btn-cav-sm"
                onClick={() => setAddingVendor(true)}
              >
                <Plus size={13} /> Add new vendor
              </button>
            ) : (
              <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Enter new vendor details below ↓</span>
            )}
          </div>

          {addingVendor && (
            <div className="sm:col-span-2" style={{ background: "var(--bg-muted)", borderRadius: 8, padding: 12 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="New Vendor Name" required>
                  <input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} className={inputCls} placeholder="Vendor name" />
                </Field>
                <Field label="GSTIN (optional)">
                  <input value={newVendorGstin} onChange={(e) => setNewVendorGstin(e.target.value.toUpperCase())} className={inputCls} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </Field>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" className="btn-cav btn-cav-primary btn-cav-sm" onClick={commitNewVendor}>
                  Add vendor
                </button>
                <button type="button" className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => { setAddingVendor(false); setNewVendorName(""); setNewVendorGstin(""); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Invoice ── */}
        <Section title="Invoice" icon={FileText}>
          <Field label="Invoice available?">
            <div className="seg-control" role="group">
              <button type="button" className={invoiceAvailable === "no" ? "active" : ""} onClick={() => setInvoiceAvailable("no")}>No</button>
              <button type="button" className={invoiceAvailable === "yes" ? "active" : ""} onClick={() => setInvoiceAvailable("yes")}>Yes</button>
            </div>
          </Field>
          <div />
          {invoiceAvailable === "yes" && (
            <>
              <Field label="Invoice Number" required error={errors.invoiceNo}>
                <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputCls} placeholder="INV-0001" />
              </Field>
              <Field label="Invoice Date" required error={errors.invoiceDate}>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
        </Section>

        {/* ── Amount / GST ── */}
        <Section title="Amount & GST" icon={Percent}>
          <Field label="GST applicable?">
            <div className="seg-control" role="group">
              <button type="button" className={!gstApplicable ? "active" : ""} onClick={() => setGstApplicable(false)}>No</button>
              <button type="button" className={gstApplicable ? "active" : ""} onClick={() => setGstApplicable(true)}>Yes</button>
            </div>
          </Field>
          <div />

          {!gstApplicable ? (
            <Field label="Amount (₹)" required error={errors.amount}>
              <input
                type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls} placeholder="0.00"
              />
            </Field>
          ) : (
            <>
              <Field label="GST Number" required error={errors.gstNumber}>
                <input
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className={inputCls} placeholder="22AAAAA0000A1Z5" maxLength={15}
                />
              </Field>
              <Field label="GST Type">
                <div className="seg-control" role="group">
                  <button
                    type="button"
                    className={gstType === "intra" ? "active" : ""}
                    onClick={() => { setGstType("intra"); recomputeGst(taxable, gstRate, "intra"); }}
                  >
                    Intra (CGST+SGST)
                  </button>
                  <button
                    type="button"
                    className={gstType === "inter" ? "active" : ""}
                    onClick={() => { setGstType("inter"); recomputeGst(taxable, gstRate, "inter"); }}
                  >
                    Inter (IGST)
                  </button>
                </div>
              </Field>

              <Field label="Taxable Amount (₹)" required error={errors.taxable}>
                <input
                  type="number" step="0.01" min="0" value={taxable}
                  onChange={(e) => { setTaxable(e.target.value); recomputeGst(e.target.value, gstRate, gstType); }}
                  className={inputCls} placeholder="0.00"
                />
              </Field>
              <Field label="GST Rate">
                <select
                  value={gstRate}
                  onChange={(e) => { const r = Number(e.target.value); setGstRate(r); recomputeGst(taxable, r, gstType); }}
                  className={inputCls}
                >
                  {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </Field>

              <Field label="CGST (₹)">
                <input
                  type="number" step="0.01" min="0" value={cgst}
                  onChange={(e) => setCgst(e.target.value)}
                  className={inputCls} placeholder="0.00" disabled={gstType === "inter"}
                />
              </Field>
              <Field label="SGST (₹)">
                <input
                  type="number" step="0.01" min="0" value={sgst}
                  onChange={(e) => setSgst(e.target.value)}
                  className={inputCls} placeholder="0.00" disabled={gstType === "inter"}
                />
              </Field>
              <Field label="IGST (₹)">
                <input
                  type="number" step="0.01" min="0" value={igst}
                  onChange={(e) => setIgst(e.target.value)}
                  className={inputCls} placeholder="0.00" disabled={gstType === "intra"}
                />
              </Field>
              <Field label="Total Amount (₹)" error={errors.gstTotal}>
                <input
                  value={inr(gstTotal)} readOnly
                  className={inputCls}
                  style={{ background: "var(--bg-muted)", fontWeight: 600, color: "var(--fg-1)" }}
                />
              </Field>
            </>
          )}
        </Section>

        {/* ── Customer (Customer Expense only) ── */}
        {isCustomerExpense && (
          <Section title="Customer" icon={Users} desc="Tag this expense to a customer for profitability reporting.">
            <Field label="Customer" required error={errors.customer}>
              <CustomerNameCombobox
                value={customer}
                onChange={setCustomer}
                className={inputCls}
                placeholder="Search customer…"
              />
            </Field>
            <div />
            <Field label="Project">
              <input value={project} onChange={(e) => setProject(e.target.value)} className={inputCls} placeholder="Project name / code" />
            </Field>
            <Field label="Order">
              <input value={order} onChange={(e) => setOrder(e.target.value)} className={inputCls} placeholder="PO / Order reference" />
            </Field>
          </Section>
        )}

        {/* ── Attachment ── */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Paperclip size={14} />
              </span>
              <div>
                <div className="ch-title">Attachment</div>
                <div className="ch-sub">Upload the bill or receipt — images or PDF, up to 5 files.</div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                width: "100%", border: "1.5px dashed var(--border-strong)", borderRadius: 8,
                background: "var(--bg-muted)", padding: "22px 16px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                color: "var(--fg-3)",
              }}
            >
              <Paperclip size={20} />
              <span style={{ fontSize: 12.5 }}>Click to upload bill / receipt</span>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>JPG, PNG, or PDF · max 5 files</span>
            </button>
            <input
              ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden
              onChange={(e) => onFiles(e.target.files)}
            />

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {attachments.map((a) => (
                  <div key={a.id} style={{ position: "relative", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-elev)" }}>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      aria-label="Remove attachment"
                      style={{
                        position: "absolute", top: 4, right: 4, zIndex: 2,
                        width: 20, height: 20, borderRadius: 999, border: "none",
                        background: "rgba(15,17,21,0.6)", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <X size={12} />
                    </button>
                    {a.isPdf ? (
                      <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)" }}>
                        <FileText size={28} />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.name} style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }} />
                    )}
                    <div style={{ padding: "5px 7px", fontSize: 10.5, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>
                      {a.isPdf ? <FileText size={10} /> : <ImageIcon size={10} />}
                      {a.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Voucher ── */}
        <div className="card">
          <div className="card-body">
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox" checked={genVoucher}
                onChange={(e) => setGenVoucher(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--caveo-red)" }}
              />
              <Banknote size={16} style={{ color: "var(--fg-3)" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>Generate Cash Voucher</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                  Create a numbered cash voucher on submission{effectiveAmount > 0 ? ` for ${inr(effectiveAmount)}` : ""}.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-1 pb-2">
          <button type="button" className="btn-cav btn-cav-ghost" onClick={handleCancel} style={{ order: 3 }}>
            Cancel
          </button>
          <button type="button" className="btn-cav btn-cav-secondary" onClick={() => handleSave("draft")} style={{ order: 2 }}>
            Save Draft
          </button>
          <button type="button" className="btn-cav btn-cav-primary" onClick={() => handleSave("submit")} style={{ order: 1 }}>
            <Receipt size={14} /> Submit Expense
          </button>
        </div>
      </div>
    </div>
  );
}
