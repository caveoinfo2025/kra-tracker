"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Suspense } from "react";

// ─── Path → label ─────────────────────────────────────────────────────────────

const PATH_LABELS: { prefix: string; label: string }[] = [
  { prefix: "/dashboard",              label: "Dashboard" },
  { prefix: "/pipeline/analytics",     label: "Pipeline Analytics" },
  { prefix: "/pipeline/leads",         label: "Leads" },
  { prefix: "/pipeline/opportunities", label: "Opportunities" },
  { prefix: "/pipeline/tasks",         label: "Pipeline Tasks" },
  { prefix: "/collections",            label: "Collections" },
  { prefix: "/daily-updates",          label: "Daily Updates" },
  { prefix: "/employees",              label: "Team" },
  { prefix: "/kras",                   label: "KRAs" },
  { prefix: "/accounts",               label: "Payment Tracker" },
  { prefix: "/import",                 label: "Import" },
  { prefix: "/",                       label: "Team Overview" },
];

function getLabel(pathname: string): string {
  for (const { prefix, label } of PATH_LABELS) {
    if (prefix === "/") {
      if (pathname === "/") return label;
    } else if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return label;
    }
  }
  return "Caveo CRM";
}

const PERIODS = ["Today", "Week", "Month", "Quarter"] as const;
type Period = (typeof PERIODS)[number];

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────

function TopbarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const label = getLabel(pathname);
  const isDashboard = pathname === "/dashboard";
  const activePeriod = (searchParams.get("period") as Period) ?? "Week";

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <header className="topbar">
      {/* Breadcrumbs */}
      <div className="tb-crumbs">
        <span>Caveo</span>
        <span className="sep">/</span>
        <span className="leaf">{label}</span>
      </div>

      {/* Search bar */}
      <div className="tb-search">
        <Search size={13} className="tb-search-icon" />
        <input
          className="tb-search-input"
          placeholder="Search deals, leads, tasks…"
          type="search"
        />
      </div>

      <div className="tb-spacer" />

      {/* Period filter — only on dashboard */}
      {isDashboard && (
        <div className="tb-period">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={"tb-period-btn" + (activePeriod === p ? " active" : "")}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Export wrapped in Suspense (required for useSearchParams) ────────────────

export default function Topbar() {
  return (
    <Suspense fallback={
      <header className="topbar">
        <div className="tb-crumbs"><span>Caveo</span></div>
        <div className="tb-spacer" />
      </header>
    }>
      <TopbarInner />
    </Suspense>
  );
}
