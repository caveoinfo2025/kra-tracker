/**
 * Phase 15 Update: KrasClient
 *
 * Updated to display EmployeeTarget metrics instead of legacy KRA.
 * Shows metric breakdown per template item.
 *
 * Fallback: displays legacy KRA if no EmployeeTarget exists.
 *
 * To use: replace current src/app/kras/KrasClient.tsx with this file
 */

"use client";

import { useState } from "react";
import Link from "next/link";

interface KRAMetric {
  id: number;
  code: string;
  name: string;
  metricType: string;
}

interface KRATemplateItem {
  id: number;
  templateId: number;
  metricId: number;
  metric: KRAMetric;
  weightage: number;
  expectedTarget: number;
  stretchTarget: number;
}

interface KRATemplate {
  id: number;
  name: string;
  items: KRATemplateItem[];
}

interface KRAAchievement {
  id: number;
  metricId: number;
  actualValue: number;
  achievementPct: number;
  weightedScore: number;
}

interface PerformanceReview {
  id: number;
  selfRating: number;
  managerRating: number;
  finalRating: number;
  comments: string;
}

interface EmployeeTarget {
  id: number;
  employeeProfileId: number;
  periodId: number;
  templateId: number;
  template: KRATemplate;
  achievements: KRAAchievement[];
  reviews: PerformanceReview[];
}

interface LegacyKRA {
  id: number;
  title: string;
  target: string;
  reviews?: Array<{ progress: number; score: number }>;
  weeklyCommits?: Array<{ commitText: string }>;
  certifications?: Array<{ certName: string }>;
}

interface EmployeeData {
  id: number;
  name: string;
  email: string;
  role: string;
  employeeProfile?: {
    employeeTargets: EmployeeTarget[];
  };
  kras: LegacyKRA[];
}

interface KrasClientProps {
  isManager: boolean;
  employees: EmployeeData[];
  currentWeek: number;
  currentYear: number;
}

export default function KrasClient({
  isManager,
  employees,
  currentWeek,
  currentYear,
}: KrasClientProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const handleSyncAchievements = async () => {
    setSyncing(true);
    setSyncMessage("Syncing achievements...");

    try {
      const res = await fetch("/api/kra/sync-achievements", {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        setSyncMessage(`Error: ${err.error || "Sync failed"}`);
        return;
      }

      const data = await res.json();
      setSyncMessage(`✓ Synced ${data.synced} employees`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">KRA Tracker</h1>
        {isManager && (
          <button
            onClick={handleSyncAchievements}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Achievements"}
          </button>
        )}
      </div>

      {syncMessage && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
          {syncMessage}
        </div>
      )}

      {!isManager && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
          📊 View and update your own KRA progress below
        </div>
      )}

      <div className="space-y-6">
        {employees.map((employee) => {
          const targets = employee.employeeProfile?.employeeTargets ?? [];
          const hasNewTargets = targets.length > 0;
          const legacyKras = employee.kras ?? [];

          // Show new EmployeeTarget system if available
          if (hasNewTargets) {
            return (
              <div key={employee.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-2xl font-bold">{employee.name}</h2>
                  <p className="text-sm text-gray-600">{employee.role}</p>
                </div>

                {targets.map((target) => (
                  <EmployeeTargetCard
                    key={target.id}
                    target={target}
                    employee={employee}
                  />
                ))}
              </div>
            );
          }

          // Fallback: show legacy KRA if no EmployeeTarget exists
          if (legacyKras.length > 0) {
            return (
              <div key={employee.id} className="bg-white rounded-lg shadow-lg p-6 opacity-75">
                <div className="border-b pb-4 mb-4 bg-yellow-50 p-3 rounded">
                  <h2 className="text-2xl font-bold">{employee.name}</h2>
                  <p className="text-xs text-yellow-700">
                    ⚠️ Using legacy KRA system (migration pending)
                  </p>
                </div>

                {legacyKras.map((kra) => (
                  <LegacyKRACard
                    key={kra.id}
                    kra={kra}
                    employee={employee}
                    currentWeek={currentWeek}
                    currentYear={currentYear}
                  />
                ))}
              </div>
            );
          }

          // No targets or KRAs
          return (
            <div key={employee.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold">{employee.name}</h2>
              <p className="text-gray-600">No KRA targets assigned</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// EmployeeTargetCard — NEW: displays EmployeeTarget + metrics
// ────────────────────────────────────────────────────────────────

function EmployeeTargetCard({
  target,
  employee,
}: {
  target: EmployeeTarget;
  employee: EmployeeData;
}) {
  const achievements = target.achievements || [];
  const latestReview = target.reviews?.[0];

  // Calculate overall weighted score
  let totalWeightedScore = 0;
  let totalWeightage = 0;

  const metricRows = target.template.items.map((item) => {
    const achievement = achievements.find((a) => a.metricId === item.metricId);
    const pct = achievement?.achievementPct ?? 0;
    const clampedPct = Math.min(pct, 100);

    totalWeightedScore += achievement?.weightedScore ?? 0;
    totalWeightage += item.weightage;

    return {
      item,
      achievement,
      pct: clampedPct,
    };
  });

  const overallScore = totalWeightage > 0 ? totalWeightedScore / (totalWeightage / 100) : 0;

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{target.template.name}</h3>

      {/* Metrics Grid */}
      <div className="space-y-3 mb-4">
        {metricRows.map(({ item, achievement, pct }) => (
          <div key={item.metricId} className="flex items-center gap-4 p-2 bg-white rounded">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.metric.name}</p>
              {achievement && (
                <p className="text-xs text-gray-500">
                  {achievement.actualValue.toFixed(1)} / {item.expectedTarget.toFixed(1)}
                </p>
              )}
            </div>
            <div className="w-32">
              <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-right">
              <span className="text-sm font-semibold">{pct.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Score */}
      <div className="p-3 bg-blue-50 rounded flex justify-between items-center">
        <span className="font-semibold">Overall Score</span>
        <span className="text-lg font-bold text-blue-600">{overallScore.toFixed(1)} / 10</span>
      </div>

      {/* Latest Review */}
      {latestReview && (
        <div className="mt-3 p-2 bg-purple-50 rounded text-sm">
          <p className="font-semibold">Manager Rating: {latestReview.managerRating.toFixed(1)}</p>
          {latestReview.comments && <p className="text-gray-700 mt-1">{latestReview.comments}</p>}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// LegacyKRACard — FALLBACK: displays legacy KRA (backward compat)
// ────────────────────────────────────────────────────────────────

function LegacyKRACard({
  kra,
  employee,
  currentWeek,
  currentYear,
}: {
  kra: LegacyKRA;
  employee: EmployeeData;
  currentWeek: number;
  currentYear: number;
}) {
  const latestReview = kra.reviews?.[0];
  const weeklyCommit = kra.weeklyCommits?.[0];

  return (
    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-base font-semibold">{kra.title}</h4>
          <p className="text-xs text-gray-600 mt-1">Target: {kra.target}</p>
        </div>
        {latestReview && (
          <div className="text-right">
            <p className="text-sm font-bold">Progress: {latestReview.progress}%</p>
            <p className="text-sm text-gray-600">Score: {latestReview.score}/10</p>
          </div>
        )}
      </div>

      {weeklyCommit && (
        <div className="mt-2 p-2 bg-white rounded text-sm">
          <p className="font-semibold">This Week's Commit:</p>
          <p className="text-gray-700">{weeklyCommit.commitText}</p>
        </div>
      )}

      <p className="text-xs text-yellow-700 mt-2">
        ⚠️ This KRA uses the legacy system. It will be migrated soon.
      </p>
    </div>
  );
}
