"use client";
import { useRef } from "react";
import { Paperclip, FileText, Image as ImageIcon, X, Download } from "lucide-react";

export interface AttachmentItem { id: string; name: string; url?: string; isPdf: boolean }

/**
 * ExpenseAttachmentViewer — upload bill photo / PDF, multiple attachments,
 * preview / download / remove, plus a "No bill available" toggle.
 * `readOnly` renders view-only (drawer); editable renders the upload zone.
 */
export default function ExpenseAttachmentViewer({
  items, readOnly, noBill, onAdd, onRemove, onToggleNoBill,
}: {
  items: AttachmentItem[];
  readOnly?: boolean;
  noBill?: boolean;
  onAdd?: (files: FileList) => void;
  onRemove?: (id: string) => void;
  onToggleNoBill?: (v: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      {!readOnly && (
        <>
          <button type="button" onClick={() => ref.current?.click()} disabled={noBill}
            style={{ width: "100%", border: "1.5px dashed var(--border-strong)", borderRadius: 8, background: "var(--bg-muted)", padding: "20px 16px", cursor: noBill ? "not-allowed" : "pointer", opacity: noBill ? 0.5 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--fg-3)" }}>
            <Paperclip size={20} />
            <span style={{ fontSize: 12.5 }}>Upload bill photo or PDF</span>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>JPG, PNG, PDF · multiple allowed</span>
          </button>
          <input ref={ref} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => e.target.files && onAdd?.(e.target.files)} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: "var(--fg-2)", cursor: "pointer" }}>
            <input type="checkbox" checked={!!noBill} onChange={(e) => onToggleNoBill?.(e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} />
            No bill available
          </label>
        </>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginTop: readOnly ? 0 : 12 }}>
          {items.map((a) => (
            <div key={a.id} style={{ position: "relative", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-elev)" }}>
              {!readOnly && onRemove && (
                <button type="button" onClick={() => onRemove(a.id)} aria-label="Remove"
                  style={{ position: "absolute", top: 4, right: 4, zIndex: 2, width: 20, height: 20, borderRadius: 999, border: "none", background: "rgba(15,17,21,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={12} />
                </button>
              )}
              {a.isPdf || !a.url ? (
                <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)" }}><FileText size={26} /></div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.name} style={{ width: "100%", height: 64, objectFit: "cover", display: "block" }} />
              )}
              <div style={{ padding: "5px 7px", fontSize: 10.5, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>
                {a.isPdf ? <FileText size={10} /> : <ImageIcon size={10} />}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                {readOnly && <Download size={11} style={{ flexShrink: 0 }} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {readOnly && items.length === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>{noBill ? "Marked as no bill available." : "No attachments."}</div>
      )}
    </div>
  );
}
