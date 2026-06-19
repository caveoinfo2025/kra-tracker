"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

type Employee = { id: number; name: string; email: string };

// ─── Field definitions ────────────────────────────────────────────────────────

const SALES_FIELDS: Record<string, { label: string; required?: boolean; aliases: string[] }> = {
  customerName:      { label: "Customer Name",        required: true,  aliases: ["customer","customer name","client","client name","account","company","party"] },
  opportunityName:   { label: "Opportunity / Deal",   required: true,  aliases: ["opportunity","deal","deal name","opportunity name","project","subject","description"] },
  stage:             { label: "Stage",                               aliases: ["stage","status","deal stage","pipeline stage","opportunity stage"] },
  dealValueLakhs:    { label: "Deal Value (₹L)",                    aliases: ["deal value","booking","booking value","deal amount","value","amount","order value","deal value (lakhs)","booking (lakhs)"] },
  billingValueLakhs: { label: "Billing Value (₹L)",                 aliases: ["billing value","billing","billing amount","billed amount"] },
  grossProfitPct:    { label: "GP%",                                aliases: ["gp%","gp %","gross profit","gross profit %","margin","margin %","profit %"] },
  territory:         { label: "Territory",                          aliases: ["territory","region","area","zone","location"] },
  solutionCategory:  { label: "Solution Category",                  aliases: ["solution","category","product","solution category","product category","vertical"] },
  expectedCloseDate: { label: "Expected Close Date",               aliases: ["close date","expected close","closing date","target date","expected closing date"] },
  employeeName:      { label: "Salesperson",                        aliases: ["salesperson","sales rep","owner","assigned to","employee","rep","account manager","sales person"] },
  remarks:           { label: "Remarks",                            aliases: ["remarks","notes","comment","comments"] },
};

const COLLECTION_FIELDS: Record<string, { label: string; required?: boolean; aliases: string[] }> = {
  customerName:          { label: "Customer Name",            required: true,  aliases: ["customer","customer name","client","client name","account","party","company"] },
  invoiceNo:             { label: "Invoice No",                               aliases: ["invoice no","invoice number","invoice #","bill no","bill number","invoice id"] },
  invoiceDate:           { label: "Invoice Date",                             aliases: ["invoice date","bill date","date","raised date"] },
  invoiceValueLakhs:     { label: "Invoice Value (₹L)",       required: true,  aliases: ["invoice value","amount","total","invoice amount","billed amount","invoice total","bill amount","invoice value (lakhs)","invoice value (₹l)"] },
  amountWithoutGstLakhs: { label: "Total (Without GST) (₹L)",                aliases: ["total without gst","without gst","amount without gst","taxable value","taxable amount","net amount","base amount","amount ex-gst","ex-gst","excl gst","excluding gst","amount excl gst","pre-gst amount","amount (without gst)","total (without gst)","without gst (₹l)","net value"] },
  dueDate:               { label: "Due Date",                 required: true,  aliases: ["due date","payment due","due by","payment due date","due"] },
  amountReceivedLakhs:   { label: "Amount Received (₹L)",                    aliases: ["amount received","received","payment received","collection amount","paid amount","amount paid"] },
  paymentReceivedDate:   { label: "Payment Received Date",                    aliases: ["paid on","paid date","payment date","payment received date","date received","received date","date paid","settlement date","receipt date","payment on"] },
  collectionStatus:      { label: "Collection Status",                        aliases: ["status","collection status","payment status","collection"] },
  employeeName:          { label: "Salesperson",                              aliases: ["salesperson","sales rep","owner","employee","rep","account manager"] },
  remarks:               { label: "Remarks",                                  aliases: ["remarks","notes","comment"] },
};

// ─── Auto-detect column mapping ───────────────────────────────────────────────

function autoMap(headers: string[], fields: typeof SALES_FIELDS): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, def] of Object.entries(fields)) {
    const match = headers.find((h) =>
      def.aliases.some((a) => h.toLowerCase().trim() === a)
    );
    if (match) mapping[match] = field;
  }
  return mapping;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportClient({ employees }: { employees: Employee[] }) {
  const [tab, setTab] = useState<"sales" | "collections">("sales");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultEmployee, setDefaultEmployee] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: { row: number; reason: string; customer: string; ref: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fields = tab === "sales" ? SALES_FIELDS : COLLECTION_FIELDS;

  const [showErrors, setShowErrors] = useState(false);

  function reset() {
    setHeaders([]); setRows([]); setMapping({}); setFileName(""); setResult(null); setError(""); setShowErrors(false);
  }

  function handleTabChange(t: "sales" | "collections") {
    setTab(t); reset();
  }

  function handleFile(file: File) {
    reset();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (json.length === 0) { setError("File appears to be empty."); return; }
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setRows(json.slice(0, 200));
      setMapping(autoMap(hdrs, fields));
    };
    reader.readAsArrayBuffer(file);
  }

  // Reverse mapping: field → header
  const fieldToHeader: Record<string, string> = {};
  for (const [h, f] of Object.entries(mapping)) fieldToHeader[f] = h;

  function setFieldMapping(header: string, field: string) {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove any existing mapping to this field
      for (const h of Object.keys(next)) {
        if (next[h] === field) delete next[h];
      }
      if (field) next[header] = field; else delete next[header];
      return next;
    });
  }

  // Mapped field list for required check
  const mappedFields = new Set(Object.values(mapping));
  const missingRequired = Object.entries(fields)
    .filter(([k, v]) => v.required && !mappedFields.has(k))
    .map(([, v]) => v.label);

  async function handleImport() {
    setImporting(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, mapping, rows, defaultEmployeeName: defaultEmployee }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["sales", "collections"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-white shadow text-[#CC2229]" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t === "sales" ? "📈 Sales / Bookings" : "💰 Collections"}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#CC2229] hover:bg-red-50 transition"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <p className="text-3xl mb-2">📂</p>
        {fileName ? (
          <p className="text-sm font-medium text-[#CC2229]">{fileName} — {rows.length} rows loaded</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">Drop your CSV or Excel file here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse · .csv, .xls, .xlsx</p>
          </>
        )}
      </div>

      {/* Column mapping */}
      {headers.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Map Columns</h2>
            <span className="text-xs text-gray-500">{Object.keys(mapping).length} of {headers.length} columns mapped</span>
          </div>

          <div className="divide-y max-h-72 overflow-y-auto">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-4 px-5 py-2.5">
                <span className="w-44 text-sm text-gray-700 truncate font-mono" title={h}>{h}</span>
                <span className="text-gray-300">→</span>
                <select
                  value={mapping[h] ?? ""}
                  onChange={(e) => setFieldMapping(h, e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                >
                  <option value="">(skip)</option>
                  {Object.entries(fields).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}{v.required ? " *" : ""}
                    </option>
                  ))}
                </select>
                {mapping[h] && (
                  <span className="text-xs text-green-600 w-16">✓ mapped</span>
                )}
              </div>
            ))}
          </div>

          {/* Default employee fallback */}
          <div className="px-5 py-3 border-t bg-gray-50 flex items-center gap-4">
            <span className="text-sm text-gray-600 w-44">Default Salesperson</span>
            <span className="text-gray-300">→</span>
            <select
              value={defaultEmployee}
              onChange={(e) => setDefaultEmployee(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
            >
              <option value="">— use value from file —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400 w-16">fallback</span>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Preview (first 5 rows)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {Object.entries(mapping).map(([h, f]) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                      {fields[f]?.label ?? f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.keys(mapping).map((h) => (
                      <td key={h} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                        {String(row[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-import warning: required fields not mapped */}
      {missingRequired.length > 0 && rows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          ⚠️ Required fields not yet mapped: <strong>{missingRequired.join(", ")}</strong>
        </div>
      )}

      {/* API-level error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Import result */}
      {result && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                <span className="text-sm text-gray-700">
                  <strong className="text-green-700">{result.inserted}</strong> new records inserted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                <span className="text-sm text-gray-700">
                  <strong className="text-blue-700">{result.updated}</strong> existing records updated
                  {tab === "collections" && (
                    <span className="text-xs text-gray-400 ml-1">(matched by Invoice No)</span>
                  )}
                  {tab === "sales" && (
                    <span className="text-xs text-gray-400 ml-1">(matched by Customer + Opportunity)</span>
                  )}
                </span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="text-sm text-gray-700">
                    <strong className="text-red-700">{result.skipped}</strong> rows skipped
                  </span>
                  <button
                    onClick={() => setShowErrors((v) => !v)}
                    className="text-xs underline text-[#CC2229] hover:text-[#A81B21]"
                  >
                    {showErrors ? "Hide details" : "Show details"}
                  </button>
                </div>
              )}
              {result.skipped === 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-700 font-medium">All rows processed successfully</span>
                </div>
              )}
            </div>
          </div>

          {/* Error rows table */}
          {showErrors && result.errors.length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-red-800">
                  {result.errors.length} skipped row{result.errors.length !== 1 ? "s" : ""} — fix and re-upload
                </h3>
                <span className="text-xs text-red-600">
                  Correct the issues below in your file, then upload it again
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500 w-16">Row</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">Customer</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">
                        {tab === "collections" ? "Invoice No" : "Opportunity"}
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.errors.map((e) => (
                      <tr key={e.row} className="hover:bg-red-50">
                        <td className="px-4 py-2 text-gray-500 font-mono">{e.row}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium">{e.customer}</td>
                        <td className="px-4 py-2 text-gray-600">{e.ref}</td>
                        <td className="px-4 py-2 text-red-700">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            disabled={importing || missingRequired.length > 0}
            className="bg-[#CC2229] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import / Update ${rows.length} rows → ${tab === "sales" ? "Sales Funnel" : "Collections"}`}
          </button>
          <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        </div>
      )}

      {/* Template download hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Tip — column names your CRM export should include</p>
        {tab === "sales" ? (
          <>
            <p className="text-xs text-blue-700">
              <strong>Required:</strong> Customer Name, Opportunity Name ·
              <strong> Optional:</strong> Deal Value, Stage, Territory, Solution Category, GP%, Close Date, Salesperson, Remarks
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Re-uploading is safe — existing records are matched by <strong>Customer + Opportunity Name</strong> and updated in place.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-blue-700">
              <strong>Required:</strong> Customer Name, Invoice Value, Due Date ·
              <strong> Optional:</strong> Invoice No, Invoice Date, Total (Without GST), Amount Received, Payment Received Date, Status, Salesperson, Remarks
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Re-uploading is safe — existing records are matched by <strong>Invoice No</strong> and updated in place (rows without an Invoice No are always inserted as new).
            </p>
          </>
        )}
        <p className="text-xs text-blue-600 mt-1">Column names are matched automatically — exact spelling not required.</p>
      </div>
    </div>
  );
}
