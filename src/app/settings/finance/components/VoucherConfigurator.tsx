"use client";

import { useState } from "react";
import type { VoucherConfigRecord } from "@/lib/finance-engine";

const VOUCHER_TYPES = ["EXPENSE", "PAYMENT", "RECEIPT", "ADVANCE", "CONVEYANCE", "JOURNAL"];
const NUMBER_FORMATS = [
  { value: "PREFIX-YEAR-SEQ", label: "PREFIX/FY/00001" },
  { value: "PREFIX-SEQ",      label: "PREFIX/00001" },
  { value: "CUSTOM",          label: "PREFIX-FY-00001" },
];

interface Props {
  initialConfigs: VoucherConfigRecord[];
}

export default function VoucherConfigurator({ initialConfigs }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ voucherType: "EXPENSE", prefix: "", numberFormat: "PREFIX-YEAR-SEQ", financialYearReset: true });

  function preview() {
    if (!form.prefix) return "EXP/26-27/00001";
    const fy = "26-27";
    const seq = "00001";
    if (form.numberFormat === "PREFIX-YEAR-SEQ") return `${form.prefix}/${fy}/${seq}`;
    if (form.numberFormat === "PREFIX-SEQ") return `${form.prefix}/${seq}`;
    return `${form.prefix}-${fy}-${seq}`;
  }

  async function handleCreate() {
    if (!form.voucherType || !form.prefix) { setError("Voucher type and prefix are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/finance/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json() as { config?: VoucherConfigRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.config) setConfigs((prev) => [...prev, data.config!]);
      setForm({ voucherType: "EXPENSE", prefix: "", numberFormat: "PREFIX-YEAR-SEQ", financialYearReset: true });
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleToggle(c: VoucherConfigRecord) {
    const newStatus = c.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/finance/voucher", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, status: newStatus }),
    });
    if (res.ok) setConfigs((prev) => prev.map((x) => x.id === c.id ? { ...x, status: newStatus } : x));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Voucher Configuration</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            Define voucher number formats for each transaction type.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 7, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          + Add Voucher Type
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>New Voucher Configuration</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Voucher Type *</label>
              <select
                value={form.voucherType}
                onChange={(e) => setForm((f) => ({ ...f, voucherType: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              >
                {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Prefix *</label>
              <input
                value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                placeholder="e.g. EXP"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Number Format</label>
              <select
                value={form.numberFormat}
                onChange={(e) => setForm((f) => ({ ...f, numberFormat: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              >
                {NUMBER_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.financialYearReset} onChange={(e) => setForm((f) => ({ ...f, financialYearReset: e.target.checked }))} />
                Reset sequence each financial year
              </label>
            </div>
          </div>
          {form.prefix && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--accent)", borderRadius: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Preview: </span>
              <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: "var(--foreground)" }}>{preview()}</span>
            </div>
          )}
          {error && <p style={{ fontSize: 12, color: "var(--caveo-red)", marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Config"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "7px 16px", fontSize: 13, borderRadius: 6, background: "transparent", border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {configs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
            No voucher types configured yet.
          </div>
        ) : configs.map((c) => (
          <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{c.voucherType}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>
                  {c.prefix}/{c.financialYearReset ? "FY/" : ""}{String(c.runningNumber + 1).padStart(5, "0")}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>#{c.runningNumber} used</span>
                {c.financialYearReset && <span style={{ fontSize: 10, background: "rgba(0,102,255,0.1)", color: "#0066FF", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>FY RESET</span>}
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 600, background: c.status === "active" ? "rgba(0,180,0,0.1)" : "rgba(200,16,46,0.1)", color: c.status === "active" ? "#00AA00" : "var(--caveo-red)" }}>
                  {c.status.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                Format: {c.numberFormat} · FY: {c.financialYear || "—"}
              </p>
            </div>
            <button onClick={() => handleToggle(c)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}>
              {c.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
