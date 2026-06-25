"use client";
import { useState } from "react";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import MobileKpiCard from "@/components/mobile/MobileKpiCard";
import { mockTaskDetail } from "../mock-data";

interface TaskDetailScreenProps {
  onBack: () => void;
  onToast?: (message: string) => void;
}

export default function TaskDetailScreen({ onBack, onToast }: TaskDetailScreenProps) {
  const t = mockTaskDetail;
  const [subtasks, setSubtasks] = useState(t.subtasks);

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow={t.id} title="Task detail" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <MobileStatusPill status="danger" label="High priority" />
            <MobileStatusPill status="info" label="In progress" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {t.title}
          </h2>
        </div>

        <div className="m-section">
          <div className="m-kpi-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <MobileKpiCard label="Assigned by" value={t.assignedBy} valueSize={15} />
            <MobileKpiCard label="Due date" value={t.dueDate} valueSize={15} />
            <MobileKpiCard label="Department" value={t.department} valueSize={15} />
            <MobileKpiCard label="Time estimate" value={t.timeEstimate} valueSize={15} />
          </div>
        </div>

        <div className="m-section">
          <div className="m-card">
            <h4 className="m-subhead">Requirements</h4>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--fg-2)", margin: 0 }}>{t.description}</p>
          </div>
        </div>

        <div className="m-section">
          <div className="m-card">
            <h4 className="m-subhead">Sub-tasks</h4>
            {subtasks.map((s, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: i < subtasks.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${s.done ? "var(--caveo-red)" : "var(--border)"}`,
                    background: s.done ? "var(--caveo-red)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  onClick={() =>
                    setSubtasks((prev) => prev.map((p, idx) => (idx === i ? { ...p, done: !p.done } : p)))
                  }
                >
                  {s.done && <MIcon name="check" size={11} color="#fff" />}
                </span>
                <span style={{ fontSize: 13, color: s.done ? "var(--fg-3)" : "var(--fg-1)", textDecoration: s.done ? "line-through" : "none" }}>
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="m-section" style={{ display: "flex", gap: 8 }}>
          <button className="m-btn m-btn-secondary" onClick={() => onToast?.("Editing tasks is not available in this preview")}>
            Edit details
          </button>
          <button className="m-btn" onClick={() => onToast?.("Status update is not available in this preview")}>
            Update status
          </button>
        </div>
      </MobileAppShell>
    </div>
  );
}
