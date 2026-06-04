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
import TeamScreen from "./screens/TeamScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import CollectionsScreen from "./screens/CollectionsScreen";
import ExpenseClaimScreen from "./screens/ExpenseClaimScreen";
import ConveyanceScreen from "./screens/ConveyanceScreen";
import QuickLogSheet from "./screens/QuickLogSheet";
import LogActivitySheet from "./screens/LogActivitySheet";
import ScanCardScreen from "./screens/ScanCardScreen";
import type { MobileLead } from "./types";

type Tab = "home" | "pipeline" | "updates" | "me";

type Screen =
  | { type: "tab" }
  | { type: "deal"; lead: MobileLead }
  | { type: "notifications" }
  | { type: "kras" }
  | { type: "team"; mode: "pipeline" | "kra" }
  | { type: "scan" }
  | { type: "compose" }
  | { type: "collections" }
  | { type: "expense" }
  | { type: "conveyance" };

type LogSheet = { kind: "call" | "meeting"; lead: MobileLead | null } | null;

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
  const [logSheet, setLogSheet] = useState<LogSheet>(null);
  const [updatesKey, setUpdatesKey] = useState(0);
  const [dealKey, setDealKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

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

  function pushTeam(mode: "pipeline" | "kra") {
    setScreen({ type: "team", mode });
    setShowQuickLog(false);
  }

  function pushCompose() {
    setScreen({ type: "compose" });
    setShowQuickLog(false);
  }

  function pushScan() {
    setScreen({ type: "scan" });
    setShowQuickLog(false);
  }

  function pushCollections() {
    setScreen({ type: "collections" });
    setShowQuickLog(false);
  }

  function pushExpense() {
    setScreen({ type: "expense" });
    setShowQuickLog(false);
  }

  function pushConveyance() {
    setScreen({ type: "conveyance" });
    setShowQuickLog(false);
  }

  // Navigate to Opportunities: switch to pipeline tab in opps view
  function pushOpportunities() {
    switchTab("pipeline");
    // PipelineScreen maintains its own view state; user can tap "Opportunities" segment
    // We show a toast to guide them
    showToast('Switch to Opportunities tab in Pipeline');
  }

  function handleQuickLogAction(type: string) {
    setShowQuickLog(false);
    if (type === "update") {
      setActiveTab("updates");
      setScreen({ type: "compose" });
    } else if (type === "lead" || type === "deal") {
      setScreen({ type: "scan" });
    } else if (type === "call" || type === "meeting") {
      setLogSheet({ kind: type, lead: null });
    } else if (type === "expense") {
      setScreen({ type: "expense" });
    } else if (type === "conveyance") {
      setScreen({ type: "conveyance" });
    }
  }

  function popScreen() {
    setScreen({ type: "tab" });
  }

  function renderScreen() {
    if (screen.type === "notifications") {
      return <NotificationsScreen onBack={popScreen} />;
    }
    if (screen.type === "deal") {
      return (
        <DealDetailScreen
          key={dealKey}
          lead={screen.lead}
          onBack={popScreen}
          onLogCall={(lead) => setLogSheet({ kind: "call", lead })}
        />
      );
    }
    if (screen.type === "team") {
      return <TeamScreen mode={screen.mode} onBack={popScreen} />;
    }
    if (screen.type === "scan") {
      return (
        <ScanCardScreen
          onBack={() => switchTab("pipeline")}
          onCreated={() => {
            switchTab("pipeline");
            showToast("Lead created from card");
          }}
        />
      );
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
    if (screen.type === "collections") {
      return (
        <CollectionsScreen
          isManager={isManager}
          onBack={popScreen}
        />
      );
    }
    if (screen.type === "expense") {
      return (
        <ExpenseClaimScreen
          onBack={popScreen}
          onSubmitted={showToast}
        />
      );
    }
    if (screen.type === "conveyance") {
      return (
        <ConveyanceScreen
          onBack={popScreen}
          onSubmitted={showToast}
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
          onViewPipeline={() => switchTab("pipeline")}
          onCollections={pushCollections}
        />
      );
    }
    if (activeTab === "pipeline") {
      return (
        <PipelineScreen
          isManager={isManager}
          onDealClick={pushDeal}
          onScanCard={pushScan}
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
          onTeam={pushTeam}
          onTasks={() => switchTab("pipeline")}
          onCollections={pushCollections}
          onOpportunities={pushOpportunities}
          onExpense={pushExpense}
          onConveyance={pushConveyance}
        />
      );
    }
    return null;
  }

  const showTabBar = screen.type === "tab";

  return (
    <div className="mobile-root">
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {renderScreen()}

        {/* Quick Log bottom sheet */}
        {showQuickLog && (
          <QuickLogSheet
            onClose={() => setShowQuickLog(false)}
            onAction={handleQuickLogAction}
          />
        )}

        {/* Log Call / Meeting sheet */}
        {logSheet && (
          <LogActivitySheet
            kind={logSheet.kind}
            lead={logSheet.lead}
            onClose={() => setLogSheet(null)}
            onLogged={() => {
              const k = logSheet.kind;
              setLogSheet(null);
              if (screen.type === "deal") setDealKey((n) => n + 1);
              showToast(k === "call" ? "Call logged" : "Meeting logged");
            }}
          />
        )}

        {/* Toast */}
        {toast && (
          <div style={{
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
          }}>
            <MIcon name="check" size={14} color="#fff" /> {toast}
          </div>
        )}
      </div>

      {/* Tab bar */}
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
