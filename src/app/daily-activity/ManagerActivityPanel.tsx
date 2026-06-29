"use client";
/**
 * Phase W3 — manager-facing read-only Daily Activity dashboard + per-employee/day detail
 * drill-in. Manager-only (enforced server-side: this component is only rendered when
 * session.user.isManager is true). Date changes and drill-ins call the Phase W2 manager-only
 * API routes (GET /api/daily-activity/team, GET /api/daily-activity/team/[employeeId]/[date])
 * client-side. No write actions — approve/reject/reopen are disabled placeholders for a later phase.
 */
import { Fragment, useState } from "react";
import Badge from "@/components/Badge";
import type { TeamDailyActivityView, ManagerEmployeeDayView } from "@/lib/daily-activity";
import {
  bandLabel, BAND_VARIANT, summaryStatusLabel, SUMMARY_STATUS_VARIANT,
  activityTypeLabel, formatDateTime,
} from "./labels";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ManagerActivityPanel({ initialTeam }: { initialTeam: TeamDailyActivityView }) {
  const [date, setDate] = useState(initialTeam.date || todayStr());
  const [team, setTeam] = useState(initialTeam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<string, ManagerEmployeeDayView>>({});
  const [detailLoading, setDetailLoading] = useState<number | null>(null);

  async function loadTeam(newDate: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/daily-activity/team?date=${newDate}`);
      if (!res.ok) { setError("Failed to load team activity."); return; }
      const data: TeamDailyActivityView = await res.json();
      setTeam(data);
    } catch {
      setError("Something went wrong loading team activity.");
    } finally {
      setLoading(false);
    }
  }

  function onDateChange(newDate: string) {
    setDate(newDate);
    setExpandedId(null);
    loadTeam(newDate);
  }

  async function toggleDetail(employeeId: number) {
    if (expandedId === employeeId) { setExpandedId(null); return; }
    setExpandedId(employeeId);
    const key = `${employeeId}:${date}`;
    if (details[key]) return;
    setDetailLoading(employeeId);
    try {
      const res = await fetch(`/api/daily-activity/team/${employeeId}/${date}`);
      if (res.ok) {
        const data: ManagerEmployeeDayView = await res.json();
        setDetails((prev) => ({ ...prev, [key]: data }));
      }
    } finally {
      setDetailLoading(null);
    }
  }

  const t = team.totals;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Team Daily Activity</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        />
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <CountTile label="Employees" value={t.employeeCount} />
        <CountTile label="No Activity" value={t.noActivityCount} />
        <CountTile label="Summary Pending" value={t.summaryPendingCount} />
        <CountTile label="Incomplete" value={t.incompleteCount} />
        <CountTile label="Closed" value={t.closedCount} />
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : team.employees.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No team members found for this date.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Employee</th>
                <th className="text-left px-3 py-2">Summary Status</th>
                <th className="text-left px-3 py-2">Band</th>
                <th className="text-right px-3 py-2">Total Points</th>
                <th className="text-left px-3 py-2">Activities</th>
                <th className="text-left px-3 py-2">Last Activity</th>
                <th className="text-center px-3 py-2">Correction</th>
                <th className="text-center px-3 py-2">Needs Review</th>
                <th className="text-right px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {team.employees.map((row) => {
                const key = `${row.employeeId}:${date}`;
                const detail = details[key];
                const isExpanded = expandedId === row.employeeId;
                return (
                  <Fragment key={row.employeeId}>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-gray-800">{row.employeeName}</td>
                      <td className="px-3 py-2"><Badge label={summaryStatusLabel(row.summaryStatus)} variant={SUMMARY_STATUS_VARIANT[row.summaryStatus] ?? "neutral"} /></td>
                      <td className="px-3 py-2"><Badge label={bandLabel(row.productivityBand)} variant={BAND_VARIANT[row.productivityBand] ?? "neutral"} /></td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{row.totalPoints}</td>
                      <td className="px-3 py-2 text-gray-600">{row.activityCounts.activitiesCompleted}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.lastActivityAt ? formatDateTime(row.lastActivityAt) : "—"}</td>
                      <td className="px-3 py-2 text-center">{row.hasCorrectionPending ? <Badge label="Pending" variant="danger" /> : "—"}</td>
                      <td className="px-3 py-2 text-center">{row.needsReview ? <Badge label="Review" variant="warning" /> : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => toggleDetail(row.employeeId)} className="text-xs text-[#CC2229] hover:underline">
                          {isExpanded ? "Hide" : "View details"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t bg-gray-50/60">
                        <td colSpan={9} className="px-3 py-3">
                          {detailLoading === row.employeeId ? (
                            <div className="text-gray-400 text-sm py-4 text-center">Loading detail…</div>
                          ) : detail ? (
                            <EmployeeDayDetail detail={detail} />
                          ) : (
                            <div className="text-gray-400 text-sm py-4 text-center">No detail available.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function EmployeeDayDetail({ detail }: { detail: ManagerEmployeeDayView }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-gray-800">{detail.employeeName}</span>
        <span className="text-xs text-gray-500">{detail.summaryDate}</span>
        <Badge label={summaryStatusLabel(detail.summaryStatus)} variant={SUMMARY_STATUS_VARIANT[detail.summaryStatus] ?? "neutral"} />
        <Badge label={bandLabel(detail.productivityBand)} variant={BAND_VARIANT[detail.productivityBand] ?? "neutral"} />
        <span className="text-sm font-semibold text-gray-700">Total: {detail.totalPoints} pts</span>
      </div>

      <div className="bg-white border rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Activity timeline</h4>
        {detail.activityTimeline.length === 0 ? (
          <p className="text-sm text-gray-400">No activity recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {detail.activityTimeline.map((entry, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b last:border-b-0 pb-1.5 last:pb-0">
                <span className="text-gray-700">{activityTypeLabel(entry.activityType)}</span>
                <span className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDateTime(entry.capturedAt)}</span>
                  <span className="font-semibold text-gray-700">{entry.points} pts</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button disabled title="Coming in next phase" className="text-xs border border-gray-200 text-gray-400 px-2.5 py-1 rounded cursor-not-allowed">Approve (coming in next phase)</button>
        <button disabled title="Coming in next phase" className="text-xs border border-gray-200 text-gray-400 px-2.5 py-1 rounded cursor-not-allowed">Reject (coming in next phase)</button>
        <button disabled title="Coming in next phase" className="text-xs border border-gray-200 text-gray-400 px-2.5 py-1 rounded cursor-not-allowed">Reopen (coming in next phase)</button>
      </div>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-lg py-2">
      <div className="text-lg font-semibold text-gray-800">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}
