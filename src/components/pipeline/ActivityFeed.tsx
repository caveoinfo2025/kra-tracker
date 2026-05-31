"use client";
import { ActivitySerialized } from "@/types/pipeline";

const ACTION_ICONS: Record<string, string> = {
  created:        "🟢",
  stage_changed:  "🔄",
  task_created:   "📋",
  task_completed: "✅",
  note_added:     "📝",
  meeting_logged: "📅",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return "just now";
}

export function ActivityFeed({ activities }: { activities: ActivitySerialized[] }) {
  if (!activities.length) {
    return <p className="text-sm text-gray-400 py-4 text-center">No activity yet.</p>;
  }
  return (
    <div className="space-y-3">
      {activities.map((a) => (
        <div key={a.id} className="flex gap-3 items-start">
          <span className="text-lg flex-shrink-0 mt-0.5">
            {ACTION_ICONS[a.action] ?? "•"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">{a.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {a.performedBy?.name} · {timeAgo(a.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
