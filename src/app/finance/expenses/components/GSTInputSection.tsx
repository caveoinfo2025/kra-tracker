"use client";
import { GST_RATES, fmtINR } from "../data";

export interface GSTState {
  enabled: boolean;
  gstNumber: string;
  taxable: string;
  rate: number;
  type: "intra" | "inter";
  cgst: string;
  sgst: string;
  igst: string;
}

export const EMPTY_GST: GSTState = { enabled: false, gstNumber: "", taxable: "", rate: 18, type: "intra", cgst: "", sgst: "", igst: "" };

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

export function gstTotal(g: GSTState): number {
  const t = parseFloat(g.taxable) || 0;
  return t + (parseFloat(g.cgst) || 0) + (parseFloat(g.sgst) || 0) + (parseFloat(g.igst) || 0);
}

/** GSTInputSection — enable + GSTIN + taxable + auto-split CGST/SGST/IGST + total. */
export default function GSTInputSection({ value, onChange }: { value: GSTState; onChange: (g: GSTState) => void }) {
  const g = value;
  const set = (patch: Partial<GSTState>) => onChange({ ...g, ...patch });

  function recompute(taxable: string, rate: number, type: "intra" | "inter") {
    const t = parseFloat(taxable) || 0;
    if (!(t > 0)) return { cgst: "", sgst: "", igst: "" };
    if (type === "intra") { const h = ((t * rate) / 100 / 2).toFixed(2); return { cgst: h, sgst: h, igst: "" }; }
    return { cgst: "", sgst: "", igst: ((t * rate) / 100).toFixed(2) };
  }

  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--fg-1)", cursor: "pointer" }}>
        <input type="checkbox" checked={g.enabled} onChange={(e) => set({ enabled: e.target.checked })} style={{ accentColor: "var(--caveo-red)" }} />
        GST applicable
      </label>

      {g.enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginTop: 12 }}>
          <div className="sm:col-span-2"><label className={labelCls}>Vendor GST Number</label>
            <input value={g.gstNumber} onChange={(e) => set({ gstNumber: e.target.value.toUpperCase() })} className={inputCls} maxLength={15} placeholder="29AABCC1234A1Z5" />
          </div>
          <div><label className={labelCls}>Taxable Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={g.taxable} onChange={(e) => set({ taxable: e.target.value, ...recompute(e.target.value, g.rate, g.type) })} className={inputCls} placeholder="0.00" />
          </div>
          <div><label className={labelCls}>GST Rate</label>
            <select value={g.rate} onChange={(e) => { const r = Number(e.target.value); set({ rate: r, ...recompute(g.taxable, r, g.type) }); }} className={inputCls}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>GST Type</label>
            <div className="seg-control">
              <button type="button" className={g.type === "intra" ? "active" : ""} onClick={() => set({ type: "intra", ...recompute(g.taxable, g.rate, "intra") })}>Intra (CGST+SGST)</button>
              <button type="button" className={g.type === "inter" ? "active" : ""} onClick={() => set({ type: "inter", ...recompute(g.taxable, g.rate, "inter") })}>Inter (IGST)</button>
            </div>
          </div>
          <div><label className={labelCls}>CGST (₹)</label><input type="number" value={g.cgst} onChange={(e) => set({ cgst: e.target.value })} className={inputCls} disabled={g.type === "inter"} placeholder="0.00" /></div>
          <div><label className={labelCls}>SGST (₹)</label><input type="number" value={g.sgst} onChange={(e) => set({ sgst: e.target.value })} className={inputCls} disabled={g.type === "inter"} placeholder="0.00" /></div>
          <div><label className={labelCls}>IGST (₹)</label><input type="number" value={g.igst} onChange={(e) => set({ igst: e.target.value })} className={inputCls} disabled={g.type === "intra"} placeholder="0.00" /></div>
          <div><label className={labelCls}>Total Invoice Amount</label>
            <input value={fmtINR(gstTotal(g))} readOnly className={inputCls} style={{ background: "var(--bg-muted)", fontWeight: 600 }} />
          </div>
        </div>
      )}
    </div>
  );
}
