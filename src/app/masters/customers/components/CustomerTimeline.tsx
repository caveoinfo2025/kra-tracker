"use client";
import { CustomerAuditEntry, fmtDate } from "../data";

/** CustomerTimeline — audit trail of customer changes. */
export default function CustomerTimeline({ history }: { history: CustomerAuditEntry[] }) {
  if (history.length === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No audit entries yet.</div>;
  }
  return (
    <div className="timeline">
      {history.map((e, i) => (
        <div key={i} className="timeline-item">
          <div className="body">
            <b>{e.action}</b> by {e.by}
            {e.field && (
              <span style={{ marginLeft: 6, fontSize: 11.5, color: "var(--fg-3)" }}>
                {e.field}{e.oldVal && e.newVal ? `: ${e.oldVal} → ${e.newVal}` : ""}
              </span>
            )}
          </div>
          <div className="when">{fmtDate(e.at)}</div>
        </div>
      ))}
    </div>
  );
}
