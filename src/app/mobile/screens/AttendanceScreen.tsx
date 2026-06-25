"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileKpiCard from "@/components/mobile/MobileKpiCard";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import { mockAttendance } from "../mock-data";

interface AttendanceScreenProps {
  onBack: () => void;
}

export default function AttendanceScreen({ onBack }: AttendanceScreenProps) {
  const a = mockAttendance;
  const isCheckedIn = a.status === "checked-in";

  return (
    <div className="m-screen">
      <MobileHeader variant="page" title="Attendance" eyebrow="Self-service" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <div className="m-card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span
                  className="m-pill"
                  style={{ color: isCheckedIn ? "var(--success)" : "var(--fg-3)" }}
                >
                  {isCheckedIn ? "Checked in" : "Checked out"}
                </span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginTop: 8 }}>
                  {a.checkInTime}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                  Projected checkout {a.projectedCheckout}
                </div>
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--bg-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--caveo-red)",
                }}
              >
                <MIcon name="fingerprint" size={24} />
              </div>
            </div>
            <button className="m-btn" style={{ marginTop: 16 }}>
              {isCheckedIn ? "Check out" : "Check in"}
            </button>
          </div>
        </div>

        <div className="m-section">
          <div className="m-kpi-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <MobileKpiCard label="Days present" value={a.daysPresent} />
            <MobileKpiCard label="Infractions" value={a.infractions} />
            <MobileKpiCard label="Leave balance" value={a.leaveBalance} />
          </div>
        </div>

        <div className="m-section">
          <div className="m-insight info">
            <span className="ico">
              <MIcon name="pin" size={15} />
            </span>
            <div className="body">
              <div className="title">Location verified</div>
              <div className="desc">{a.location}</div>
            </div>
          </div>
        </div>

        <div className="m-section">
          <MobileSectionHeader label="Recent logs" />
          <div className="m-list">
            {a.logs.map((log, i) => (
              <div className="m-list-row" key={i}>
                <div className="row-main">
                  <div className="row-title">{log.date}</div>
                  <div className="row-sub">
                    {log.checkIn} – {log.checkOut} · {log.note}
                  </div>
                </div>
                <div className="row-trailing">
                  <MobileStatusPill
                    status={log.status}
                    label={log.status === "approved" ? "Approved" : log.status === "pending" ? "Pending" : "Leave"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </MobileAppShell>
    </div>
  );
}
