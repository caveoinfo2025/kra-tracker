"use client";
/**
 * Phase W3 (read-only) → Phase W5 (write-enabled) — employee-facing Daily Activity view.
 * Deliberately never renders an exact points value anywhere (hard rule — the API already
 * omits points from this shape; this component must not reintroduce them even via
 * activityTimeline, which has no points field).
 *
 * Phase W5 adds the write flows on top of the existing read-only surface: end-of-day summary
 * submit/edit (POST/PUT /api/daily-activity/summary) and correction requests
 * (POST /api/daily-activity/corrections). Both are self-scoped only — `employeeId` is never
 * read from this component's state into a request payload; the API resolves it from the
 * session, so there is no field here that could even be wired to send one.
 */
import { useState } from "react";
import Badge from "@/components/Badge";
import type { EmployeeDailyActivityView, EmployeeHistoryEntry } from "@/lib/daily-activity";
import {
  bandLabel, BAND_VARIANT, summaryStatusLabel, SUMMARY_STATUS_VARIANT,
  activityTypeLabel, sourceTypeLabel, formatTime,
  ACTIVITY_TYPE_OPTIONS, SOURCE_TYPE_OPTIONS,
} from "./labels";

export default function EmployeeActivityView({
  initialToday,
  initialHistory,
}: {
  initialToday: EmployeeDailyActivityView;
  initialHistory: EmployeeHistoryEntry[];
}) {
  const [today, setToday] = useState(initialToday);
  const [history, setHistory] = useState(initialHistory);
  const [refreshing, setRefreshing] = useState(false);
  const hasActivity = today.activityTimeline.length > 0;

  async function refreshAll() {
    setRefreshing(true);
    try {
      const [t, h] = await Promise.all([
        fetch("/api/daily-activity/today").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/daily-activity/history").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (t) setToday(t);
      if (h) setHistory(h);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">My Daily Activity — {today.date}</h2>

      {/* ── Status summary card ───────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={summaryStatusLabel(today.summaryStatus)} variant={SUMMARY_STATUS_VARIANT[today.summaryStatus] ?? "neutral"} />
          <Badge label={bandLabel(today.employeeVisibleStatus)} variant={BAND_VARIANT[today.employeeVisibleStatus] ?? "neutral"} />
          {today.correctionRequestStatus && (
            <Badge label={`Correction: ${today.correctionRequestStatus}`} variant="info" />
          )}
          {refreshing && <span className="text-xs text-gray-400">Refreshing…</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <CountTile label="Activities" value={today.activityCounts.activitiesCompleted} />
          <CountTile label="Leads Qualified" value={today.activityCounts.leadsQualified} />
          <CountTile label="Meetings Done" value={today.activityCounts.meetingsCompleted} />
          <CountTile label="Tasks Done" value={today.activityCounts.tasksCompleted} />
          <CountTile label="Proposals Sent" value={today.activityCounts.proposalsSent} />
          <CountTile label="Follow-ups" value={today.activityCounts.followUpsDone} />
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t">
          <span>Cutoff: <strong className="text-gray-700">8:00 PM</strong></span>
          <span>Grace until: <strong className="text-gray-700">10:00 PM</strong></span>
        </div>
      </div>

      <SummaryForm today={today} onChanged={refreshAll} />

      {/* ── Activity timeline (read-only, system-captured — never editable) ─── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Today&apos;s activity timeline</h3>
        {!hasActivity ? (
          <div className="text-center py-8 text-gray-400">
            <p className="font-medium">No activity recorded</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {today.activityTimeline.map((entry, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b last:border-b-0 pb-2 last:pb-0">
                <div>
                  <span className="font-medium text-gray-700">{activityTypeLabel(entry.activityType)}</span>
                  {entry.description && <span className="text-gray-500 ml-2">{entry.description}</span>}
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-3">{formatTime(entry.capturedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CorrectionRequestPanel today={today} onChanged={refreshAll} />

      {/* ── Recent history ────────────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent history</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No history yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <div key={h.date} className="border rounded-lg px-2.5 py-1.5 text-xs">
                <div className="text-gray-500">{h.date}</div>
                <Badge label={bandLabel(h.productivityBand)} variant={BAND_VARIANT[h.productivityBand] ?? "neutral"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Submit/edit form for the three employee-owned summary fields. Never sends `employeeId` —
 *  the request body shape has no such field, only `date`/`blockers`/`nextDayPlan`/`finalRemarks`. */
function SummaryForm({ today, onChanged }: { today: EmployeeDailyActivityView; onChanged: () => Promise<void> }) {
  // Once a summary has actually been submitted (status moved to CLOSED/LATE_SUBMITTED, or it
  // carried into PENDING_CORRECTION afterwards), use PUT to edit; otherwise this is the
  // first-ever submission for the day and uses POST. REOPENED always goes back through POST —
  // `submitDailyActivitySummary` treats a manager reopen as an explicit resubmission window.
  const useEdit = today.summaryStatus === "CLOSED" || today.summaryStatus === "LATE_SUBMITTED" || today.summaryStatus === "PENDING_CORRECTION";

  const [blockers, setBlockers] = useState(today.blockers);
  const [nextDayPlan, setNextDayPlan] = useState(today.nextDayPlan);
  const [finalRemarks, setFinalRemarks] = useState(today.finalRemarks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const allowed = useEdit ? today.canEditSummary : today.canSubmitSummary;

  async function handleSubmit() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/daily-activity/summary", {
        method: useEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today.date, blockers, nextDayPlan, finalRemarks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? "Failed to save summary." });
        return;
      }
      setMessage({ type: "success", text: useEdit ? "Summary updated." : "End-of-day summary submitted." });
      await onChanged();
    } catch {
      setMessage({ type: "error", text: "Something went wrong saving the summary." });
    } finally {
      setSaving(false);
    }
  }

  const buttonLabel = saving
    ? "Saving…"
    : !allowed
      ? (useEdit ? "Locked" : "Submission not available")
      : (useEdit ? "Update Summary" : "Submit End-of-Day Summary");

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">End-of-day summary</h3>

      <FormField label="Blockers" value={blockers} onChange={setBlockers} disabled={!allowed || saving} placeholder="Anything blocking you today?" />
      <FormField label="Next-day plan" value={nextDayPlan} onChange={setNextDayPlan} disabled={!allowed || saving} placeholder="What's planned for tomorrow?" />
      <FormField label="Final remarks" value={finalRemarks} onChange={setFinalRemarks} disabled={!allowed || saving} placeholder="Any closing notes for today?" />

      {!allowed && (
        <p className="text-xs text-gray-500">
          {useEdit
            ? "This summary is locked and can no longer be edited."
            : "The submission window for today has closed, or there is nothing to submit yet."}
        </p>
      )}

      {message && (
        <p className={`text-sm px-2.5 py-1.5 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allowed || saving}
        className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
          !allowed || saving
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#CC2229] text-white hover:bg-[#b51d23]"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function FormField({
  label, value, onChange, disabled, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={2}
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC2229] disabled:bg-gray-50 disabled:text-gray-400"
      />
    </label>
  );
}

/** Correction request flow — employee requests a correction for a missing/wrong captured
 *  activity. Never lets the employee set points; the request body has no such field. */
function CorrectionRequestPanel({ today, onChanged }: { today: EmployeeDailyActivityView; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [activityType, setActivityType] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit() {
    if (!activityType || !sourceType || !reason.trim()) {
      setMessage({ type: "error", text: "Activity type, source type, and reason are all required." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/daily-activity/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today.date,
          requestedActivityType: activityType,
          requestedSourceType: sourceType,
          requestedSourceId: sourceId ? Number(sourceId) : undefined,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? "Failed to submit correction request." });
        return;
      }
      setMessage({ type: "success", text: "Correction request submitted — pending manager review." });
      setActivityType(""); setSourceType(""); setSourceId(""); setReason("");
      setOpen(false);
      await onChanged();
    } catch {
      setMessage({ type: "error", text: "Something went wrong submitting the correction request." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Correction requests</h3>
        {today.correctionRequestStatus === "PENDING" ? (
          <Badge label="Pending correction" variant="warning" />
        ) : (
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-[#CC2229] hover:underline">
            {open ? "Cancel" : "Request Correction"}
          </button>
        )}
      </div>

      {today.correctionRequestStatus === "PENDING" && (
        <p className="text-sm text-gray-500">
          A correction request is awaiting manager review. You can submit another one once it is decided.
        </p>
      )}

      {open && today.correctionRequestStatus !== "PENDING" && (
        <div className="space-y-2.5 border-t pt-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Date</span>
            <input type="text" value={today.date} readOnly className="w-full text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Activity type</span>
            <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              <option value="">Select activity type…</option>
              {ACTIVITY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{activityTypeLabel(t)}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Source type</span>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              <option value="">Select source type…</option>
              {SOURCE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{sourceTypeLabel(t)}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Source ID (optional)</span>
            <input
              type="number"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              placeholder="e.g. lead/task/meeting id, if known"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              placeholder="Explain what activity is missing or incorrect"
            />
          </label>

          {message && (
            <p className={`text-sm px-2.5 py-1.5 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-[#CC2229] text-white hover:bg-[#b51d23] disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit Correction Request"}
          </button>
        </div>
      )}
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg py-2">
      <div className="text-lg font-semibold text-gray-800">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}
