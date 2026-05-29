"use client";
/**
 * DevQuickLogin — shown only in development.
 * Lets you sign in as any employee without going through Microsoft OAuth,
 * by setting the dev_employee_id cookie via /api/dev/switch.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: number; name: string; isManager: boolean };

export default function DevQuickLogin({
  employees,
  redirectTo,
}: {
  employees: Employee[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  async function loginAs(id: number) {
    setLoading(id);
    await fetch("/api/dev/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: id }),
    });
    // Hard navigation so the browser sends the freshly-set dev cookie
    // on the very next server request (soft router.push can miss it).
    window.location.href = redirectTo;
  }

  return (
    <div style={{ marginTop: 24, borderTop: "1px dashed #e5e7eb", paddingTop: 18 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#1a1a1a",
          color: "#facc15",
          borderRadius: 999,
          padding: "3px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: 600,
          marginBottom: 12,
          letterSpacing: "0.05em",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#facc15",
            display: "inline-block",
            animation: "pulse 2s infinite",
          }}
        />
        DEV — Quick Login
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "block",
          width: "100%",
          padding: "8px 14px",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          color: "#374151",
          textAlign: "left",
        }}
      >
        Select an employee to log in as {open ? "▴" : "▾"}
      </button>

      {open && (
        <ul
          style={{
            listStyle: "none",
            margin: "6px 0 0",
            padding: 0,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            textAlign: "left",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {employees.map((emp) => (
            <li key={emp.id}>
              <button
                disabled={loading === emp.id}
                onClick={() => loginAs(emp.id)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: loading === emp.id ? "#f3f4f6" : "#fff",
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  color: "#111827",
                }}
              >
                <span style={{ fontWeight: 500 }}>{emp.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: emp.isManager ? "#fef2f2" : "#f0fdf4",
                    color: emp.isManager ? "#b91c1c" : "#15803d",
                    fontWeight: 600,
                  }}
                >
                  {emp.isManager ? "Manager" : "Employee"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
