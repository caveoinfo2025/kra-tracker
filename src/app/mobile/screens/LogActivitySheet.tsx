"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";
import type { MobileLead } from "../types";

interface Props {
  kind: "call" | "meeting";
  /** Optional pre-selected lead (when opened from a deal). */
  lead?: MobileLead | null;
  onClose: () => void;
  onLogged: () => void;
}

export default function LogActivitySheet({ kind, lead, onClose, onLogged }: Props) {
  const [leads, setLeads] = useState<MobileLead[]>([]);
  const [leadId, setLeadId] = useState<number | null>(lead?.id ?? null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(!lead);

  // If no lead pre-selected, load the user's leads to pick from
  useEffect(() => {
    if (lead) return;
    fetch("/api/pipeline/leads?limit=100")
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.rows ?? []);
        setLoadingLeads(false);
      })
      .catch(() => setLoadingLeads(false));
  }, [lead]);

  const title = kind === "call" ? "Log Call" : "Log Meeting";
  const placeholder = kind === "call"
    ? "What was discussed on the call?"
    : "Meeting summary, attendees, outcomes…";

  async function save() {
    setError("");
    if (!leadId) { setError("Please select a lead."); return; }
    if (!note.trim()) { setError("Please add a note."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/pipeline/leads/${leadId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: kind,
          description: `${kind === "call" ? "📞 Call" : "🤝 Meeting"}: ${note.trim()}`,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save");
        return;
      }
      onLogged();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="m-sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-sheet-body" onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-grabber" />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          {title}
        </h2>
        {lead && (
          <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 14 }}>
            {lead.title} · {lead.companyName}
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", fontSize: 12.5, padding: "8px 12px", borderRadius: 10, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Lead picker (only when not pre-selected) */}
        {!lead && (
          <div className="m-field">
            <label className="m-field-label">Lead</label>
            {loadingLeads ? (
              <div className="m-skeleton" style={{ height: 44, borderRadius: 10 }} />
            ) : (
              <select
                className="m-input"
                value={leadId ?? ""}
                onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a lead…</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.title} — {l.companyName}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="m-field">
          <label className="m-field-label">{kind === "call" ? "Call notes" : "Meeting notes"}</label>
          <textarea
            className="m-textarea"
            placeholder={placeholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>

        <button
          className="m-btn"
          style={{ width: "100%", marginTop: 6 }}
          onClick={save}
          disabled={saving}
        >
          <MIcon name={kind === "call" ? "phone" : "calendar"} size={15} color="#fff" />
          {saving ? "Saving…" : `Save ${kind === "call" ? "Call" : "Meeting"}`}
        </button>
      </div>
    </div>
  );
}
