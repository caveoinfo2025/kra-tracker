"use client";

import { useState } from "react";
import type { ExpenseCategoryRecord, ExpenseLimitRuleRecord } from "@/lib/finance-engine";

interface Props {
  initialCategories: ExpenseCategoryRecord[];
  initialLimitRules: ExpenseLimitRuleRecord[];
}

export default function ExpensePolicyManager({ initialCategories, initialLimitRules }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [limitRules] = useState(initialLimitRules);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", requiresReceipt: false, requiresApproval: false });
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!form.name.trim() || !form.code.trim()) { setError("Name and code are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", ...form }),
      });
      const data = await res.json() as { category?: ExpenseCategoryRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.category) setCategories((prev) => [...prev, data.category!]);
      setForm({ name: "", code: "", description: "", requiresReceipt: false, requiresApproval: false });
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(cat: ExpenseCategoryRecord) {
    const newStatus = cat.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/finance/expenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, status: newStatus }),
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, status: newStatus } : c));
    }
  }

  function rulesForCategory(id: number) {
    return limitRules.filter((r) => r.expenseCategoryId === id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Expense Categories</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            Define categories with receipt and approval requirements.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 7,
            background: "var(--caveo-red)", color: "#fff", border: "none", cursor: "pointer",
          }}
        >
          + Add Category
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, margin: "0 0 16px" }}>New Expense Category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Travel"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. TRAVEL"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.requiresReceipt} onChange={(e) => setForm((f) => ({ ...f, requiresReceipt: e.target.checked }))} />
              Requires Receipt
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))} />
              Requires Approval
            </label>
          </div>
          {error && <p style={{ fontSize: 12, color: "var(--caveo-red)", marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving…" : "Save Category"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: "7px 16px", fontSize: 13, borderRadius: 6, background: "transparent", border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
            No expense categories configured yet. Add your first category above.
          </div>
        ) : (
          categories.map((cat) => {
            const rules = rulesForCategory(cat.id);
            return (
              <div key={cat.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{cat.name}</span>
                      <span style={{ fontSize: 11, fontFamily: "monospace", background: "var(--accent)", padding: "1px 6px", borderRadius: 4, color: "var(--muted-foreground)" }}>{cat.code}</span>
                      {cat.requiresReceipt && <span style={{ fontSize: 10, background: "rgba(0,102,255,0.1)", color: "#0066FF", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>RECEIPT</span>}
                      {cat.requiresApproval && <span style={{ fontSize: 10, background: "rgba(255,107,0,0.1)", color: "#FF6B00", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>APPROVAL</span>}
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 600, background: cat.status === "active" ? "rgba(0,180,0,0.1)" : "rgba(200,16,46,0.1)", color: cat.status === "active" ? "#00AA00" : "var(--caveo-red)" }}>
                        {cat.status.toUpperCase()}
                      </span>
                    </div>
                    {cat.description && <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{cat.description}</p>}
                    {rules.length > 0 && (
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                        {rules.length} limit rule{rules.length !== 1 ? "s" : ""} configured
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleStatus(cat)}
                    style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}
                  >
                    {cat.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
