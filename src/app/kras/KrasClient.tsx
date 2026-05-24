"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/components/ProgressBar";

type ReviewSerialized = {
  id: number;
  week: number;
  year: number;
  progress: number;
  score: number;
  notes: string;
};

type WeeklyCommitSerialized = {
  id: number;
  kraId: number;
  employeeId: number;
  week: number;
  year: number;
  commitText: string;
};

type KRASerialized = {
  id: number;
  title: string;
  description: string;
  target: string;
  deadline: string;
  weight: number;
  status: string;
  reviews: ReviewSerialized[];
  weeklyCommits: WeeklyCommitSerialized[];
};

type EmployeeData = {
  id: number;
  name: string;
  department: string;
  role: string;
  kras: KRASerialized[];
};

type Props = {
  isManager: boolean;
  employees: EmployeeData[];
  currentWeek: number;
  currentYear: number;
  myEmployeeId?: number;
};

function CommitInput({
  kra,
  employeeId,
  currentWeek,
  currentYear,
}: {
  kra: KRASerialized;
  employeeId: number;
  currentWeek: number;
  currentYear: number;
}) {
  const router = useRouter();
  const existingCommit = kra.weeklyCommits[0];
  const [text, setText] = useState(existingCommit?.commitText ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/weekly-commits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        kraId: kra.id,
        week: currentWeek,
        year: currentYear,
        commitText: text,
      }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2 items-start">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        onBlur={save}
        placeholder="My commit this week…"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229] resize-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-sm bg-[#CC2229] text-white px-3 py-2 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50 whitespace-nowrap"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}

function EmployeeKRACard({
  employee,
  isManager,
  currentWeek,
  currentYear,
  myEmployeeId,
}: {
  employee: EmployeeData;
  isManager: boolean;
  currentWeek: number;
  currentYear: number;
  myEmployeeId?: number;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const hasCommits = employee.kras.some((k) => k.weeklyCommits.length > 0);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    const res = await fetch("/api/kra-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: employee.id }),
    });
    const data = await res.json();
    setSyncMsg(`Synced ${data.synced} KRAs (Wk ${data.week})`);
    setSyncing(false);
    router.refresh();
  }

  const isOwnProfile = myEmployeeId === employee.id;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{employee.name}</h2>
          <p className="text-xs text-gray-500">{employee.role} — {employee.department}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasCommits ? (
            <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full">
              Week {currentWeek} commit submitted
            </span>
          ) : (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
              No commit for Week {currentWeek}
            </span>
          )}
          {isManager && (
            <>
              {syncMsg && (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                  {syncMsg}
                </span>
              )}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "Sync"}
              </button>
            </>
          )}
        </div>
      </div>

      {employee.kras.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No active KRAs.</p>
      ) : (
        <div className="space-y-4">
          {employee.kras.map((kra) => {
            const lastReview = kra.reviews[0];
            const prog = lastReview?.progress ?? 0;
            return (
              <div key={kra.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{kra.title}</p>
                    {lastReview && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{lastReview.notes}</p>
                    )}
                  </div>
                  {lastReview && (
                    <span className="text-xs font-medium text-gray-600 bg-white border px-2 py-0.5 rounded">
                      Score: {lastReview.score}/10
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar value={prog} />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{prog}%</span>
                </div>

                {/* Weekly commit input — shown only for employee viewing their own KRAs */}
                {(!isManager && isOwnProfile) && (
                  <CommitInput
                    kra={kra}
                    employeeId={employee.id}
                    currentWeek={currentWeek}
                    currentYear={currentYear}
                  />
                )}

                {/* Managers see existing commits read-only */}
                {isManager && kra.weeklyCommits.length > 0 && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                    <p className="text-xs text-blue-600 font-medium mb-0.5">Week {currentWeek} Commit:</p>
                    <p className="text-sm text-blue-800">{kra.weeklyCommits[0].commitText}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KrasClient({
  isManager,
  employees,
  currentWeek,
  currentYear,
  myEmployeeId,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? "KRA Dashboard" : `My KRAs — Week ${currentWeek}`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager
              ? `Week ${currentWeek}, ${currentYear} — all employees`
              : `Week ${currentWeek}, ${currentYear}`}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {employees.map((emp) => (
          <EmployeeKRACard
            key={emp.id}
            employee={emp}
            isManager={isManager}
            currentWeek={currentWeek}
            currentYear={currentYear}
            myEmployeeId={myEmployeeId}
          />
        ))}
      </div>
    </div>
  );
}
