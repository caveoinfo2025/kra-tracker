"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";

type Update = {
  id: number;
  date: string;
  topUpdates: string;
  keyMovement: string;
  blockers: string;
  updateStatus: string;
  employeeId: number;
  employee?: { name: string } | null;
};

interface Props {
  isManager: boolean;
  onCompose: () => void;
}

const AVATAR_COLORS = ["#5B626C","#0046B0","#B05000","#1F7A3F","#2A2A55","#702D5B"];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function dateLabel(dateStr: string) {
  const dt = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - dt.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dt.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" });
}

function statusVariant(s: string) {
  if (s === "On Track") return { bg: "#E8F5EE", c: "#1F7A3F" };
  if (s === "Needs Support") return { bg: "#FFF1E6", c: "#B05000" };
  return { bg: "#FDECEF", c: "#8E0A1F" };
}

export default function UpdatesScreen({ isManager, onCompose }: Props) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/daily-updates")
      .then(r => r.json())
      .then(data => {
        setUpdates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Group by date
  const grouped = updates.reduce<Record<string, Update[]>>((acc, u) => {
    const d = u.date.split("T")[0];
    (acc[d] || (acc[d] = [])).push(u);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const uniqueEmployees = new Set(updates.map(u => u.employeeId)).size;

  return (
    <div className="m-screen">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-nav-icon">
            <MIcon name="filter" size={16} />
          </button>
          <div className="m-nav-title">Updates</div>
          <button className="m-nav-icon" onClick={onCompose}>
            <MIcon name="plus" size={17} />
          </button>
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">Team Pulse</div>
          <h1 className="m-title">Daily Updates</h1>
          <div className="m-subtitle">
            {updates.length} updates from {uniqueEmployees} team member{uniqueEmployees !== 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div className="m-section">
            {[1,2].map(i => (
              <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "50%", marginBottom: 10 }} />
                <div className="m-skeleton" style={{ height: 48 }} />
              </div>
            ))}
          </div>
        ) : dates.length === 0 ? (
          <div className="m-section">
            <div className="m-empty">
              <div className="m-empty-title">No updates yet</div>
              <div className="m-empty-sub">
                <button
                  onClick={onCompose}
                  style={{ color: "var(--caveo-red)", background: "none", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                >
                  Post your first update →
                </button>
              </div>
            </div>
          </div>
        ) : (
          dates.map(date => (
            <div className="m-section" key={date}>
              <div className="m-section-label">{dateLabel(date)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {grouped[date].map(u => {
                  const empName = u.employee?.name ?? "Team Member";
                  const empId = u.employeeId;
                  const sv = statusVariant(u.updateStatus ?? "On Track");
                  return (
                    <div key={u.id} className="m-card">
                      {/* Header row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="m-avatar" style={{ background: AVATAR_COLORS[empId % AVATAR_COLORS.length] }}>
                            {initials(empName)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-1)" }}>{empName}</div>
                          </div>
                        </div>
                        <span style={{
                          background: sv.bg, color: sv.c,
                          padding: "3px 9px", borderRadius: 999,
                          fontSize: 10.5, fontWeight: 600,
                        }}>
                          {u.updateStatus ?? "On Track"}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45 }}>
                        {u.topUpdates}
                      </div>

                      {/* Key movement */}
                      {u.keyMovement && (
                        <div style={{
                          marginTop: 10, padding: "8px 10px",
                          background: "var(--bg-muted)", borderRadius: 8,
                          fontSize: 12, fontWeight: 600, color: "var(--fg-1)",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <MIcon name="trend-up" size={13} color="var(--caveo-red)" />
                          {u.keyMovement}
                        </div>
                      )}

                      {/* Blockers */}
                      {u.blockers && (
                        <div style={{
                          marginTop: 8, padding: "8px 10px",
                          background: "rgba(200, 16, 46, 0.06)",
                          borderLeft: "2px solid var(--caveo-red)",
                          borderRadius: 4,
                        }}>
                          <div style={{ fontSize: 10, color: "var(--caveo-red)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            Blocker
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 2 }}>{u.blockers}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
