"use client";
/**
 * DevBar — floating dev toolbar for impersonating any employee.
 * Only rendered when NODE_ENV === "development" (checked in layout.tsx).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Employee = { id: number; name: string; isManager: boolean };

export default function DevBar({
  employees,
  currentDevId,
}: {
  employees: Employee[];
  currentDevId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const current = employees.find((e) => e.id === currentDevId);

  async function switchTo(employeeId: number | null) {
    await fetch("/api/dev/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white rounded-full shadow-2xl flex items-center gap-2 px-3 py-1.5 text-xs font-mono select-none">
        {/* indicator dot */}
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
        <span className="text-gray-400">DEV</span>
        <span className="text-gray-600 mx-0.5">|</span>

        {/* current identity */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-semibold hover:text-yellow-300 transition flex items-center gap-1"
        >
          {current ? (
            <>
              {current.name}
              <span className="text-gray-400 font-normal">
                ({current.isManager ? "Manager" : "Employee"})
              </span>
            </>
          ) : (
            <span className="text-yellow-300">Real session ▾</span>
          )}
          <span className="text-gray-500 ml-0.5">{open ? "▴" : "▾"}</span>
        </button>

        {/* reset button */}
        {currentDevId && (
          <button
            onClick={() => switchTo(null)}
            disabled={pending}
            className="ml-1 text-gray-400 hover:text-red-400 transition"
            title="Reset to real session"
          >
            ✕
          </button>
        )}
      </div>

      {/* dropdown */}
      {open && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border overflow-hidden w-56">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b bg-gray-50">
            View as…
          </div>
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => switchTo(emp.id)}
              disabled={pending}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition flex items-center justify-between ${
                emp.id === currentDevId ? "bg-indigo-50 font-semibold text-indigo-700" : "text-gray-700"
              }`}
            >
              <span>{emp.name}</span>
              <span className="text-xs text-gray-400">
                {emp.isManager ? "Manager" : "Employee"}
              </span>
            </button>
          ))}
          <div className="border-t">
            <button
              onClick={() => switchTo(null)}
              disabled={pending}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition"
            >
              Reset — use real session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
