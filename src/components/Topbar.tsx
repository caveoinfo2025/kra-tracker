"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Suspense, useState } from "react";

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

// Route the search query to the most relevant page based on current location
function searchDestination(pathname: string, q: string): string {
  const encoded = encodeURIComponent(q);
  if (pathname.startsWith("/pipeline/leads"))         return `/pipeline/leads?q=${encoded}`;
  if (pathname.startsWith("/pipeline/opportunities")) return `/pipeline/opportunities?q=${encoded}`;
  if (pathname.startsWith("/pipeline/tasks"))         return `/pipeline/tasks?q=${encoded}`;
  if (pathname.startsWith("/collections"))            return `/collections?q=${encoded}`;
  if (pathname.startsWith("/employees"))              return `/employees?q=${encoded}`;
  if (pathname.startsWith("/kras"))                   return `/kras?q=${encoded}`;
  // Dashboard and everything else → tasks search
  return `/pipeline/tasks?q=${encoded}`;
}

function TopbarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const label = getLabel(pathname);
  const isDashboard = pathname === "/dashboard";
  const activePeriod = (searchParams.get("period") as Period) ?? "Week";
  const [query, setQuery] = useState("");

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(searchDestination(pathname, q));
    setQuery("");
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
      <form onSubmit={handleSearch} style={{ display: "contents" }}>
        <div className="tb-search">
          <Search size={13} className="tb-search-icon" />
          <input
            className="tb-search-input"
            placeholder="Search deals, leads, tasks…"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </form>

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
