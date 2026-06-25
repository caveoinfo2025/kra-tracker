"use client";
import { useState } from "react";
import "./mobile.css";
import MobileBottomNav, { type MobileNavTab } from "@/components/mobile/MobileBottomNav";
import HomeScreen from "./screens/HomeScreen";
import TasksScreen from "./screens/TasksScreen";
import TaskDetailScreen from "./screens/TaskDetailScreen";
import SalesScreen from "./screens/SalesScreen";
import LeadDetailScreen from "./screens/LeadDetailScreen";
import FinanceScreen from "./screens/FinanceScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import DailyUpdatesScreen from "./screens/DailyUpdatesScreen";
import ApprovalsScreen from "./screens/ApprovalsScreen";
import ApprovalDetailScreen from "./screens/ApprovalDetailScreen";
import KraScreen from "./screens/KraScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import MIcon from "./components/MIcon";

type Tab = "home" | "tasks" | "sales" | "finance" | "profile";

type Screen =
  | { type: "tab" }
  | { type: "attendance" }
  | { type: "dailyUpdates" }
  | { type: "approvals" }
  | { type: "approvalDetail"; id: string }
  | { type: "kra" }
  | { type: "notifications" }
  | { type: "taskDetail"; id: string }
  | { type: "leadDetail"; id: number };

const TABS: MobileNavTab[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "tasks", label: "Tasks", icon: "doc" },
  { key: "sales", label: "Sales", icon: "bar-chart" },
  { key: "finance", label: "Finance", icon: "wallet" },
  { key: "profile", label: "Profile", icon: "user" },
];

interface Props {
  userName: string;
  userEmail: string;
  isManager: boolean;
  employeeId: number;
}

export default function MobileApp({ userName, userEmail, isManager }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>({ type: "tab" });
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setScreen({ type: "tab" });
  }

  function popScreen() {
    setScreen({ type: "tab" });
  }

  function renderScreen() {
    switch (screen.type) {
      case "attendance":
        return <AttendanceScreen onBack={popScreen} />;
      case "dailyUpdates":
        return <DailyUpdatesScreen onBack={popScreen} />;
      case "approvals":
        return <ApprovalsScreen onBack={popScreen} onApprovalClick={(id) => setScreen({ type: "approvalDetail", id })} />;
      case "approvalDetail":
        return (
          <ApprovalDetailScreen
            onBack={() => setScreen({ type: "approvals" })}
            onDecided={(msg) => {
              setScreen({ type: "approvals" });
              showToast(msg);
            }}
          />
        );
      case "kra":
        return <KraScreen onBack={popScreen} />;
      case "notifications":
        return <NotificationsScreen onBack={popScreen} />;
      case "taskDetail":
        return <TaskDetailScreen onBack={() => switchTab("tasks")} />;
      case "leadDetail":
        return <LeadDetailScreen onBack={() => switchTab("sales")} />;
      case "tab":
      default:
        break;
    }

    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            userName={userName}
            isManager={isManager}
            onNotifications={() => setScreen({ type: "notifications" })}
            onAttendance={() => setScreen({ type: "attendance" })}
            onDailyUpdates={() => setScreen({ type: "dailyUpdates" })}
            onApprovals={() => setScreen({ type: "approvals" })}
            onKra={() => setScreen({ type: "kra" })}
          />
        );
      case "tasks":
        return <TasksScreen onTaskClick={(id) => setScreen({ type: "taskDetail", id })} />;
      case "sales":
        return <SalesScreen onDealClick={(id) => setScreen({ type: "leadDetail", id })} />;
      case "finance":
        return <FinanceScreen />;
      case "profile":
        return (
          <ProfileScreen
            userName={userName}
            userEmail={userEmail}
            isManager={isManager}
            onKra={() => setScreen({ type: "kra" })}
            onSignOut={() => showToast("Sign-out is disabled in this UI preview")}
          />
        );
      default:
        return null;
    }
  }

  const showTabBar = screen.type === "tab";

  return (
    <div className="mobile-root">
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {renderScreen()}

        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--cyber-black, #0F1115)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: 999,
              boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <MIcon name="check" size={14} color="#fff" /> {toast}
          </div>
        )}
      </div>

      {showTabBar && <MobileBottomNav tabs={TABS} active={activeTab} onChange={(key) => switchTab(key as Tab)} />}
    </div>
  );
}
