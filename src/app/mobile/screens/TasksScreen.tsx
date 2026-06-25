"use client";
import { useState } from "react";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileFilterChips from "@/components/mobile/MobileFilterChips";
import MobileListCard from "@/components/mobile/MobileListCard";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import MobileEmptyState from "@/components/mobile/MobileEmptyState";
import { mockTasks } from "../mock-data";

interface TasksScreenProps {
  onTaskClick: (taskId: string) => void;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];

const STATUS_LABEL: Record<string, { status: "danger" | "pending" | "approved" | "info"; label: string }> = {
  overdue: { status: "danger", label: "Overdue" },
  "in-progress": { status: "info", label: "In progress" },
  pending: { status: "pending", label: "Pending" },
  completed: { status: "approved", label: "Completed" },
};

export default function TasksScreen({ onTaskClick }: TasksScreenProps) {
  const [filter, setFilter] = useState("all");

  const filtered = mockTasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "today") return t.due.startsWith("Today");
    return t.status === filter;
  });

  return (
    <div className="m-screen">
      <MobileHeader variant="shell" roleBadge="TASKS" />
      <MobileAppShell hasBottomNav hasHeader>
        <div className="m-header">
          <h1 className="m-title" style={{ fontSize: 22 }}>Tasks &amp; commitments</h1>
        </div>

        <MobileFilterChips chips={FILTERS} active={filter} onChange={setFilter} />

        <div className="m-section">
          {filtered.length === 0 ? (
            <MobileEmptyState icon="doc" title="No tasks here" description="Nothing matches this filter right now." />
          ) : (
            filtered.map((task) => (
              <MobileListCard
                key={task.id}
                accentTop={task.priority === "high"}
                title={task.title}
                subtitle={`${task.id} · ${task.dept}`}
                trailing={<MobileStatusPill {...STATUS_LABEL[task.status]} />}
                meta={
                  <>
                    <span>Due {task.due}</span>
                    <span>{task.estimate}</span>
                  </>
                }
                onClick={() => onTaskClick(task.id)}
              />
            ))
          )}
        </div>
      </MobileAppShell>
    </div>
  );
}
