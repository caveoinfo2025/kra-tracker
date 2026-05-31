"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskSerialized } from "@/types/pipeline";
import { PriorityBadge } from "@/components/pipeline/StageBadge";

function timeUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) {
    const h = Math.abs(Math.floor(diff / 3600000));
    const d = Math.floor(h / 24);
    return d > 0 ? `${d}d overdue` : `${h}h overdue`;
  }
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  return d > 0 ? `in ${d}d` : `in ${h}h`;
}

export default function TasksClient({
  initialTasks,
  isManager,
  initialFilter = "pending",
  initialSearch = "",
}: {
  initialTasks: TaskSerialized[];
  isManager: boolean;
  initialFilter?: "all" | "pending" | "overdue" | "today" | "completed";
  initialSearch?: string;
}) {
  const router = useRouter();
  const [tasks, setTasks]   = useState(initialTasks);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "today" | "completed">(initialFilter);
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState(initialSearch);

  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayEnd   = useMemo(() => { const d = new Date(); d.setHours(23,59,59,999); return d; }, []);

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      const due    = new Date(t.dueDate);
      const overdue = t.status !== "completed" && due < todayStart;
      const isToday = due >= todayStart && due <= todayEnd;
      if (filter === "pending"   && t.status === "completed") return false;
      if (filter === "overdue"   && !overdue)   return false;
      if (filter === "today"     && (!isToday || t.status === "completed")) return false;
      if (filter === "completed" && t.status !== "completed") return false;
      if (priority && t.priority !== priority)  return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) &&
            !(t.lead?.companyName ?? "").toLowerCase().includes(q) &&
            !(t.assignedTo?.name ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    }),
  [tasks, filter, priority, search, todayStart, todayEnd]);

  const todayCount      = tasks.filter((t) => { const d = new Date(t.dueDate); return d >= todayStart && d <= todayEnd && t.status !== "completed"; }).length;
  const overdueCount    = tasks.filter((t) => t.status !== "completed" && new Date(t.dueDate) < todayStart).length;
  const pendingCount    = tasks.filter((t) => t.status !== "completed").length;
  const completedCount  = tasks.filter((t) => t.status === "completed").length;

  async function complete(taskId: number) {
    const res = await fetch(`/api/pipeline/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: "completed" } : t));
      router.refresh();
    }
  }

  const TABS = [
    { key: "pending",   label: "Open",      count: pendingCount },
    { key: "today",     label: "Today",     count: todayCount,     color: "text-blue-600" },
    { key: "overdue",   label: "Overdue",   count: overdueCount,   color: "text-red-600" },
    { key: "completed", label: "Completed", count: completedCount, color: "text-green-600" },
    { key: "all",       label: "All",       count: tasks.length },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === t.key ? "bg-white shadow text-[#CC2229]" : "text-gray-600 hover:text-gray-900"
            }`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${filter === t.key ? "bg-red-50 text-[#CC2229]" : `bg-white ${(t as {color?:string}).color ?? "text-gray-600"}`}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Priority filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="search"
          placeholder="Search tasks, leads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
          <option value="">All Priorities</option>
          <option>high</option><option>medium</option><option>low</option>
        </select>
        <span className="text-xs text-gray-500">{filtered.length} tasks</span>
      </div>
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No tasks in this view.</p>
        )}
        {filtered.map((t) => {
          const overdue = t.status !== "completed" && new Date(t.dueDate) < new Date();
          return (
            <div key={t.id} className={`flex items-start gap-3 p-4 hover:bg-gray-50 ${overdue ? "bg-red-50/30" : ""}`}>
              <input type="checkbox" checked={t.status === "completed"}
                onChange={() => t.status !== "completed" && complete(t.id)}
                className="mt-0.5 accent-[#CC2229] cursor-pointer" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {t.title}
                  </p>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                    {timeUntil(t.dueDate)} · {new Date(t.dueDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isManager && <span className="text-xs text-gray-400">· {t.assignedTo.name}</span>}
                  {t.lead && (
                    <Link href={`/pipeline/leads/${t.lead.id}`}
                      className="text-xs text-blue-600 hover:underline">
                      📋 {t.lead.companyName}
                    </Link>
                  )}
                  {t.opportunity && (
                    <Link href={`/pipeline/opportunities/${t.opportunity.id}`}
                      className="text-xs text-amber-600 hover:underline">
                      💼 Opportunity
                    </Link>
                  )}
                </div>
                {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
