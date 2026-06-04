"use client";
import { ImportHistoryRow, fmtDateTime } from "../data";

/** BankImportHistoryTable — previous statement imports with audit columns. */
export default function BankImportHistoryTable({ rows }: { rows: ImportHistoryRow[] }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--fg-4)", padding: "12px 0" }}>No imports yet.</div>;
  }
  const badge = (s: ImportHistoryRow["status"]) =>
    s === "Completed" ? "badge-success" : s === "Partial" ? "badge-warning" : "badge-danger";
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
      <table className="crm-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Imported By</th>
            <th>Import Date</th>
            <th className="th-right">Added</th>
            <th className="th-right">Updated</th>
            <th className="th-right">Amended</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="cell-strong" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.fileName}</td>
              <td className="cell-sub">{r.importedBy}</td>
              <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.importedAt)}</td>
              <td className="td-right" style={{ color: "var(--success)", fontWeight: 600 }}>{r.added}</td>
              <td className="td-right">{r.updated}</td>
              <td className="td-right">{r.amended}</td>
              <td><span className={`badge ${badge(r.status)}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
