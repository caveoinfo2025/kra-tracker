"use client";
import { FileText, Image, Download, AlertTriangle, Upload, Plus } from "lucide-react";
import { VendorDocument, VendorCaps, DOC_TYPES, fmtDate, todayISO } from "../data";

function DocRow({ doc }: { doc: VendorDocument }) {
  const isExpiring = doc.expiryDate && doc.expiryDate < new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const isExpired = doc.expiryDate && doc.expiryDate < todayISO();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: `1px solid ${isExpired ? "var(--caveo-red)" : isExpiring ? "var(--ot-orange)" : "var(--border)"}`, background: "var(--surface-alt)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: doc.fileType === "pdf" ? "rgba(200,16,46,0.07)" : "rgba(0,102,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {doc.fileType === "pdf" ? <FileText size={16} style={{ color: "var(--caveo-red)" }} /> : <Image size={16} style={{ color: "var(--infra-blue)" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</span>
          <span className="badge badge-neutral" style={{ fontSize: 10 }}>{doc.docType}</span>
          {isExpired && <span className="badge badge-danger" style={{ fontSize: 10 }}>Expired</span>}
          {!isExpired && isExpiring && <span className="badge badge-warning" style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}><AlertTriangle size={10} /> Expiring soon</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>
          {doc.size} · Uploaded {fmtDate(doc.uploadedAt)} by {doc.uploadedBy}
          {doc.expiryDate && <span style={{ marginLeft: 8 }}>· Expires {fmtDate(doc.expiryDate)}</span>}
        </div>
      </div>
      <button className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 8px", flexShrink: 0 }} title="Download">
        <Download size={13} />
      </button>
    </div>
  );
}

export default function VendorDocumentPanel({ documents, caps, onAdd }: { documents: VendorDocument[]; caps: VendorCaps; onAdd?: () => void }) {
  const byType = DOC_TYPES.reduce<Record<string, VendorDocument[]>>((acc, t) => {
    acc[t] = documents.filter((d) => d.docType === t);
    return acc;
  }, {} as Record<string, VendorDocument[]>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload action */}
      {caps.canEdit && (
        <div style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer" }} onClick={onAdd}>
          <Upload size={20} style={{ color: "var(--fg-4)", margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>Upload Document</div>
          <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>GST Certificate, PAN, MSME Certificate, Agreement, Bank Proof or Other</div>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); onAdd?.(); }}>
            <Plus size={13} /> Choose File
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fg-4)" }}>
          <FileText size={28} strokeWidth={1.2} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13 }}>No documents uploaded yet.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((d) => <DocRow key={d.id} doc={d} />)}
        </div>
      )}

      {/* Expiry summary */}
      {documents.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
          {documents.length} document{documents.length !== 1 ? "s" : ""} · {documents.filter((d) => d.expiryDate && d.expiryDate > todayISO()).length} with active expiry date
        </div>
      )}
    </div>
  );
}
