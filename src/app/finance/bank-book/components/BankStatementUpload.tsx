"use client";
import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";

/**
 * BankStatementUpload — drag-and-drop / browse upload area (step 1).
 * No real parsing (UI only); emits the chosen file name to the parent which
 * synthesises mock preview rows.
 */
export default function BankStatementUpload({ onFile }: { onFile: (fileName: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handle(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    onFile(f.name);
  }

  return (
    <div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files); }}
        style={{
          border: `1.5px dashed ${dragOver ? "var(--caveo-red)" : "var(--border-strong)"}`,
          background: dragOver ? "rgba(200,16,46,0.04)" : "var(--bg-muted)",
          borderRadius: 12, padding: "36px 20px", cursor: "pointer", textAlign: "center",
          transition: "border-color .15s, background .15s",
        }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <UploadCloud size={26} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>Drag &amp; drop your bank statement</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>or click to browse</div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FileSpreadsheet size={12} /> CSV, XLS, XLSX · up to 10 MB
        </div>
      </div>
      <input ref={ref} type="file" accept=".csv,.xls,.xlsx" hidden onChange={(e) => handle(e.target.files)} />
    </div>
  );
}
