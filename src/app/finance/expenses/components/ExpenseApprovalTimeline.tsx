"use client";
import { Check, X, Clock } from "lucide-react";
import { ApprovalEvent, fmtDate } from "../data";

/** ExpenseApprovalTimeline — Created → Manager → Accounts → Paid. */
export default function ExpenseApprovalTimeline({ history }: { history: ApprovalEvent[] }) {
  return (
    <div className="timeline">
      {history.map((e, i) => {
        const color = e.state === "done" ? "var(--success)" : e.state === "rejected" ? "var(--caveo-red)" : "var(--fg-4)";
        return (
          <div key={i} className="timeline-item" style={{ opacity: e.state === "pending" ? 0.7 : 1 }}>
            <div style={{ position: "absolute", left: -18, top: 2, width: 14, height: 14, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              {e.state === "done" ? <Check size={9} /> : e.state === "rejected" ? <X size={9} /> : <Clock size={9} />}
            </div>
            <div className="body" style={{ fontWeight: 600 }}>{e.stage}</div>
            <div className="when">
              {e.by}{e.date ? ` · ${fmtDate(e.date)}` : " · pending"}
              {e.note ? ` — ${e.note}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
