"use client";
import { useState } from "react";
import "./mobile.css";
import MIcon from "./components/MIcon";
import TodayScreen from "./screens/TodayScreen";
import PipelineScreen from "./screens/PipelineScreen";
import UpdatesScreen from "./screens/UpdatesScreen";
import ComposeScreen from "./screens/ComposeScreen";
import DealDetailScreen from "./screens/DealDetailScreen";
import KRAsScreen from "./screens/KRAsScreen";
import MeScreen from "./screens/MeScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import QuickLogSheet from "./screens/QuickLogSheet";
import type { MobileLead } from "./types";

type Tab = "home" | "pipeline" | "updates" | "me";

type Screen =
  | { type: "tab" }
  | { type: "deal"; lead: MobileLead }
  | { type: "notifications" }
  | { type: "kras" }
  | { type: "compose" };

interface Props {
  userName: string;
  userEmail: string;
  isManager: boolean;
  employeeId: number;
}

export default function MobileApp({ userName, userEmail, isManager, employeeId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>({ type: "tab" });
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [updatesKey, setUpdatesKey] = useState(0); // force refresh

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setScreen({ type: "tab" });
    setShowQuickLog(false);
  }

  function pushDeal(lead: MobileLead) {
    setScreen({ type: "deal", lead });
    setShowQuickLog(false);
  }

  function pushNotifications() {
    setScreen({ type: "notifications" });
    setShowQuickLog(false);
  }

  function pushKRAs() {
    setScreen({ type: "kras" });
    setShowQuickLog(false);
  }

  function pushCompose() {
    setScreen({ type: "compose" });
    setShowQuickLog(false);
  }

  function handleQuickLogAction(type: string) {
    setShowQuickLog(false);
    if (type === "update") {
      setActiveTab("updates");
      setScreen({ type: "compose" });
    } else if (type === "lead") {
      switchTab("pipeline");
    } else {
      // Log call / meeting — for now navigate to pipeline
      switchTab("pipeline");
    }
  }

  function popScreen() {
    setScreen({ type: "tab" });
  }

  // Render the active screen
  function renderScreen() {
    if (screen.type === "notifications") {
      return <NotificationsScreen onBack={popScreen} />;
    }
    if (screen.type === "deal") {
      return <DealDetailScreen lead={screen.lead} onBack={popScreen} />;
    }
    if (screen.type === "kras") {
      return (
        <KRAsScreen
          userName={userName}
          employeeId={employeeId}
          onBack={popScreen}
        />
      );
    }
    if (screen.type === "compose") {
      return (
        <ComposeScreen
          userName={userName}
          onBack={popScreen}
          onPosted={() => {
            setUpdatesKey(k => k + 1);
            setScreen({ type: "tab" });
            setActiveTab("updates");
          }}
        />
      );
    }

    // Tab views
    if (activeTab === "home") {
      return (
        <TodayScreen
          userName={userName}
          isManager={isManager}
          onNotifications={pushNotifications}
          onDealClick={pushDeal}
          onQuickLog={handleQuickLogAction}
          onKRAs={pushKRAs}
          onUpdates={() => switchTab("updates")}
        />
      );
    }
    if (activeTab === "pipeline") {
      return (
        <PipelineScreen
          isManager={isManager}
          onDealClick={pushDeal}
        />
      );
    }
    if (activeTab === "updates") {
      return (
        <UpdatesScreen
          key={updatesKey}
          isManager={isManager}
          onCompose={pushCompose}
        />
      );
    }
    if (activeTab === "me") {
      return (
        <MeScreen
          userName={userName}
          userEmail={userEmail}
          isManager={isManager}
          employeeId={employeeId}
          onKRAs={pushKRAs}
        />
      );
    }
    return null;
  }

  // Whether to show the tab bar
  const showTabBar = screen.type === "tab";

  return (
    <div className="mobile-root">
      {/* Screen content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {renderScreen()}

        {/* Quick Log bottom sheet overlay */}
        {showQuickLog && (
          <QuickLogSheet
            onClose={() => setShowQuickLog(false)}
            onAction={handleQuickLogAction}
          />
        )}
      </div>

      {/* Tab bar — only shown on main tab views */}
      {showTabBar && (
        <div className="m-tabbar" style={{ position: "fixed", bottom: "max(env(safe-area-inset-bottom, 0px), 20px)", left: 12, right: 12 }}>
          <button
            className={`m-tab${activeTab === "home" ? " active" : ""}`}
            onClick={() => switchTab("home")}
          >
            <MIcon name="home" size={18} />
            <span className="label">Today</span>
          </button>
          <button
            className={`m-tab${activeTab === "pipeline" ? " active" : ""}`}
            onClick={() => switchTab("pipeline")}
          >
            <MIcon name="pipeline" size={18} />
            <span className="label">Pipeline</span>
          </button>
          <button
            className="m-tab fab"
            onClick={() => setShowQuickLog(v => !v)}
          >
            <MIcon name="plus" size={22} color="#fff" />
          </button>
          <button
            className={`m-tab${activeTab === "updates" ? " active" : ""}`}
            onClick={() => switchTab("updates")}
          >
            <MIcon name="updates" size={18} />
            <span className="label">Updates</span>
          </button>
          <button
            className={`m-tab${activeTab === "me" ? " active" : ""}`}
            onClick={() => switchTab("me")}
          >
            <MIcon name="user" size={18} />
            <span className="label">Me</span>
          </button>
        </div>
      )}
    </div>
  );
}
