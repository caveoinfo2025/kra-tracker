"use client";

/**
 * Local Conveyance — main orchestrator (Phase 7, UI-only mock data).
 * Mirrors the Finance Phase 2 pattern: mock data in data.ts, no API calls.
 *
 * Business flow: Employee submits → Manager approves → Accounts verifies →
 * Monthly payment batch → Paid. NOT an immediate expense.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Plus, CheckCircle2, FileSpreadsheet, FileText, CreditCard, Info,
  Settings, MapPin, BarChart3,
} from "lucide-react";
import {
  TravelTrip, MonthlyStatement, ConveyanceCaps, PolicyRule, ApiTravelClaim,
  MONTHLY_STATEMENTS, POLICY_RULES,
  fmtINR, fmtDate, todayISO, tripBadge, mapApiTravelClaim,
} from "./data";
import { ConveyanceFilterValues, EMPTY_FILTERS } from "./components/ConveyanceFilters";
import ConveyanceSummaryCards   from "./components/ConveyanceSummaryCards";
import ConveyanceFilters        from "./components/ConveyanceFilters";
import TravelClaimTable         from "./components/TravelClaimTable";
import TravelEntryForm          from "./components/TravelEntryForm";
import TravelEntryDrawer        from "./components/TravelEntryDrawer";
import MonthlyRegister          from "./components/MonthlyRegister";
import MonthlySettlementPanel   from "./components/MonthlySettlementPanel";
import PolicyConfigPanel        from "./components/PolicyConfigPanel";

interface Props {
  caps: ConveyanceCaps;
  currentEmployee: string;
  currentGrade: string;
}

type Segment = "trips" | "monthly" | "settlement" | "policy";

export default function ConveyanceClient({ caps, currentEmployee, currentGrade }: Props) {
  const [trips,     setTrips]     = useState<TravelTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError,   setTripsError]   = useState<string | null>(null);
  const [monthly,   setMonthly]   = useState<MonthlyStatement[]>(MONTHLY_STATEMENTS);
  const [policies,  setPolicies]  = useState<PolicyRule[]>(POLICY_RULES);
  const [filters,   setFilters]   = useState<ConveyanceFilterValues>(EMPTY_FILTERS);
  const [segment,   setSegment]   = useState<Segment>("trips");
  const [drawer,    setDrawer]    = useState<TravelTrip | null>(null);
  const [formOpen,  setFormOpen]  = useState<{ initial: TravelTrip | null } | null>(null);
  const [settlement,setSettlement]= useState(false);
  const [toast,     setToast]     = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2400); }

  // ── Fetch live trips (read-only) ──
  useEffect(() => {
    let cancelled = false;
    setTripsLoading(true);
    setTripsError(null);
    fetch("/api/finance/conveyance")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const claims: ApiTravelClaim[] = json?.data?.claims ?? [];
        setTrips(claims.map(mapApiTravelClaim));
      })
      .catch(() => {
        if (!cancelled) setTripsError("Unable to load trips. Please try again.");
      })
      .finally(() => { if (!cancelled) setTripsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Filtered trips ──
  const scoped = useMemo(() => {
    if (caps.scope === "own") return trips.filter((t) => t.employee === currentEmployee);
    return trips;
  }, [trips, caps.scope, currentEmployee]);

  const filtered = useMemo(() => scoped.filter((t) => {
    const f = filters;
    if (f.dateFrom && t.date < f.dateFrom) return false;
    if (f.dateTo   && t.date > f.dateTo)   return false;
    if (f.month    && t.month   !== f.month)   return false;
    if (f.vehicle  && t.vehicle !== f.vehicle) return false;
    if (f.purpose  && t.purpose !== f.purpose) return false;
    if (f.status   && t.status  !== f.status)  return false;
    if (f.customer && !t.customer.toLowerCase().includes(f.customer.toLowerCase())) return false;
    if (f.employee && !t.employee.toLowerCase().includes(f.employee.toLowerCase())) return false;
    if (f.billToCustomer === "yes" && !t.billToCustomer)  return false;
    if (f.billToCustomer === "no"  &&  t.billToCustomer)  return false;
    return true;
  }), [scoped, filters]);

  // Pending approvals (for manager badge)
  const pendingCount = trips.filter((t) => t.status === "Submitted").length;

  // ── Mutations (gated — trips are now live read data; writes pending API) ──
  function applyStatus(_id: number, _status: TravelTrip["status"]) {
    flash("Approve/reject will be enabled after Conveyance write APIs are implemented.");
  }

  function saveTrip(_data: Partial<TravelTrip>, _submit: boolean) {
    flash("Add/edit trip will be enabled after Conveyance write APIs are implemented.");
    setFormOpen(null);
  }

  function processPayment(ids: number[], mode: string) {
    setMonthly((ms) => ms.map((m) =>
      ids.includes(m.id)
        ? { ...m, paidAmount: m.approvedAmount, status: "Paid" as const }
        : m
    ));
    setSettlement(false);
    flash(`Payment of ${fmtINR(monthly.filter((m) => ids.includes(m.id)).reduce((s, m) => s + m.approvedAmount - m.paidAmount, 0))} processed via ${mode}`);
  }

  function exportTrips(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Trip No", "Employee", "Customer", "Purpose", "Vehicle", "KM", "Claim", "Status"];
      const rows = filtered.map((t) => [fmtDate(t.date), t.tripNo, t.employee, t.customer, t.purpose, t.vehicle, t.payableKm, t.claimAmount, t.status]);
      const esc  = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ConveyanceRegister.xls"; a.click(); URL.revokeObjectURL(a.href);
    } else {
      const rowsHtml = filtered.map((t) => `<tr><td>${fmtDate(t.date)}</td><td>${t.tripNo}</td><td>${t.employee}</td><td>${t.customer}</td><td>${t.vehicle}</td><td style="text-align:right">${t.payableKm} KM</td><td style="text-align:right">${fmtINR(t.claimAmount)}</td><td>${t.status}</td></tr>`).join("");
      const html = `<!doctype html><html><head><title>Conveyance Register</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Local Conveyance Register — June 2026</h1><table><thead><tr><th>Date</th><th>Trip No</th><th>Employee</th><th>Customer</th><th>Vehicle</th><th>KM</th><th>Claim</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }
  }

  // ── Segment tabs ──
  const TABS: { key: Segment; label: string; show: boolean; badge?: number }[] = ([
    { key: "trips"      as Segment, label: caps.scope === "own" ? "My Trips" : caps.scope === "team" ? "Team Trips" : "Register", show: true, badge: caps.canApprove ? pendingCount : undefined },
    { key: "monthly"    as Segment, label: "Monthly",   show: true },
    { key: "settlement" as Segment, label: "Settlement", show: caps.canProcessPayment },
    { key: "policy"     as Segment, label: "Policy",     show: caps.canConfigurePolicy },
  ] as { key: Segment; label: string; show: boolean; badge?: number }[]).filter((t) => t.show);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {caps.canAdd && (
          <button className="btn-cav btn-cav-primary" onClick={() => setFormOpen({ initial: null })}>
            <Plus size={14} /> Log Trip
          </button>
        )}
        {caps.canProcessPayment && (
          <button className="btn-cav btn-cav-secondary" onClick={() => setSettlement(true)}>
            <CreditCard size={14} /> Process Payment
          </button>
        )}
        {caps.canExport && (
          <>
            <button className="btn-cav btn-cav-secondary" onClick={() => exportTrips("excel")}><FileSpreadsheet size={14} /> Excel</button>
            <button className="btn-cav btn-cav-secondary" onClick={() => exportTrips("pdf")}><FileText size={14} /> PDF</button>
          </>
        )}
      </div>

      {/* Filters */}
      <ConveyanceFilters
        value={filters}
        onApply={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        showEmployee={caps.scope !== "own"}
      />

      {/* Summary KPIs */}
      <ConveyanceSummaryCards trips={trips} monthly={monthly} caps={caps} currentEmployee={currentEmployee} />

      {/* Segment control */}
      <div className="seg-control" style={{ alignSelf: "flex-start" }}>
        {TABS.map(({ key, label, badge }) => (
          <button
            key={key}
            className={"seg-btn" + (segment === key ? " seg-active" : "")}
            onClick={() => setSegment(key)}
          >
            {label}
            {badge != null && badge > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 5, fontSize: 10 }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Role hint */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} />
        Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b>
        {caps.scope === "own" ? " — showing your trips only" : caps.scope === "team" ? " — showing team trips" : " — full register"}
        {" "}&nbsp;·&nbsp; {segment === "trips" ? "live trip data" : "illustrative mock data"}.
      </div>

      {/* Main content by segment */}
      {segment === "trips" && (
        <>
          {tripsError && (
            <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--fg-2)" }}>
              {tripsError}
            </div>
          )}
          {tripsLoading && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
              Loading trips…
            </div>
          )}
          {/* Pending approvals notice */}
          {!tripsLoading && caps.canApprove && pendingCount > 0 && (
            <div style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.25)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <CheckCircle2 size={15} color="var(--ot-orange)" />
              <span><b>{pendingCount}</b> trip{pendingCount > 1 ? "s" : ""} awaiting your approval</span>
              <button
                className="btn-cav btn-cav-sm"
                style={{ marginLeft: "auto", fontSize: 11, padding: "4px 10px" }}
                onClick={() => setFilters({ ...EMPTY_FILTERS, status: "Submitted" })}
              >Show pending</button>
            </div>
          )}
          {!tripsLoading && (
            <TravelClaimTable
              rows={filtered}
              caps={caps}
              onRowClick={setDrawer}
              onApprove={(id) => { applyStatus(id, "Approved"); }}
              onReject={(id)  => { applyStatus(id, "Rejected"); }}
            />
          )}
        </>
      )}

      {segment === "monthly" && (
        <MonthlyRegister
          statements={monthly}
          trips={trips}
          caps={caps}
          onProcess={(stmt) => { setMonthly((ms) => ms.map((m) => m.id === stmt.id ? { ...m, status: "Payment Pending" } : m)); flash("Marked for payment processing"); }}
          onExport={exportTrips}
        />
      )}

      {segment === "settlement" && caps.canProcessPayment && (
        <MonthlySettlementPanel
          statements={monthly}
          onPay={processPayment}
          onClose={() => setSegment("trips")}
        />
      )}

      {segment === "policy" && caps.canConfigurePolicy && (
        <PolicyConfigPanel rules={policies} onSave={setPolicies} />
      )}

      {/* Drawers + forms */}
      {drawer && (
        <TravelEntryDrawer
          trip={drawer}
          caps={caps}
          onClose={() => setDrawer(null)}
          onEdit={(t) => { setDrawer(null); setFormOpen({ initial: t }); }}
          onApprove={(id) => applyStatus(id, caps.canVerify ? "Verified" : "Approved")}
          onReject={(id) => applyStatus(id, "Rejected")}
          onRequestClarification={(id) => { flash("Clarification requested — employee notified"); setDrawer(null); }}
        />
      )}

      {formOpen && (
        <TravelEntryForm
          initial={formOpen.initial}
          currentEmployee={currentEmployee}
          currentGrade={currentGrade}
          onClose={() => setFormOpen(null)}
          onSave={saveTrip}
        />
      )}

      {/* Settlement modal triggered from quick action */}
      {settlement && (
        <MonthlySettlementPanel
          statements={monthly}
          onPay={processPayment}
          onClose={() => setSettlement(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--cyber-black)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 999, boxShadow: "var(--shadow-lg)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
