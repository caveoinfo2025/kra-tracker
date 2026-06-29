"use client";
/**
 * Phase W3 — employee-facing read-only Daily Activity view. Deliberately never renders an
 * exact points value anywhere (hard rule — the API already omits points from this shape;
 * this component must not reintroduce them even via activityTimeline, which has no points field).
 */
import Badge from "@/components/Badge";
import type { EmployeeDailyActivityView, EmployeeHistoryEntry } from "@/lib/daily-activity";
import {
  bandLabel, BAND_VARIANT, summaryStatusLabel, SUMMARY_STATUS_VARIANT,
  activityTypeLabel, formatTime,
} from "./labels";

export default function EmployeeActivityView({
  initialToday,
  initialHistory,
}: {
  initialToday: EmployeeDailyActivityView;
  initialHistory: EmployeeHistoryEntry[];
}) {
  const today = initialToday;
  const history = initialHistory;
  const hasActivity = today.activityTimeline.length > 0;

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
          <span>Can submit summary: <strong className="text-gray-700">{today.canSubmitSummary ? "Yes" : "No"}</strong></span>
          <span>Can edit summary: <strong className="text-gray-700">{today.canEditSummary ? "Yes" : "No"}</strong></span>
        </div>
      </div>

      {/* ── Summary fields (blockers / next-day plan / final remarks) ───────── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">End-of-day summary</h3>
        <SummaryField label="Blockers" value={today.blockers} tone="warning" />
        <SummaryField label="Next-day plan" value={today.nextDayPlan} tone="info" />
        <SummaryField label="Final remarks" value={today.finalRemarks} tone="neutral" />
        {!today.blockers && !today.nextDayPlan && !today.finalRemarks && (
          <p className="text-sm text-gray-400">No summary submitted yet.</p>
        )}
        <p className="text-xs text-gray-400 pt-1">
          Submitting or editing this summary is not available yet — coming in a later phase.
        </p>
      </div>

      {/* ── Activity timeline ─────────────────────────────────────────────── */}
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

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg py-2">
      <div className="text-lg font-semibold text-gray-800">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

function SummaryField({ label, value, tone }: { label: string; value: string; tone: "warning" | "info" | "neutral" }) {
  if (!value) return null;
  const cls = tone === "warning" ? "bg-yellow-50 text-yellow-800" : tone === "info" ? "bg-blue-50 text-blue-800" : "bg-gray-50 text-gray-700";
  return (
    <p className={`text-sm px-2.5 py-1.5 rounded ${cls}`}>
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}
