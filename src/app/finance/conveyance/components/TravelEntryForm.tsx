"use client";

/**
 * TravelEntryForm — slide-in drawer form for adding / editing a travel trip.
 * Supports Bike/Car (GPS + KM calc) and Public Transport (ticket fields).
 * All GPS capture is UI-only (mock addresses, no real Maps API).
 */

import { useState, useEffect } from "react";
import {
  X, MapPin, Navigation, Navigation2, Bike, Car, Bus, Calculator,
  Camera, AlertCircle, CheckCircle2, Upload, Users,
} from "lucide-react";
import {
  TravelTrip, VehicleType, VisitPurpose, TransportType, GeoPoint,
  VEHICLE_TYPES, VISIT_PURPOSES, TRANSPORT_TYPES,
  MOCK_CUSTOMERS, MOCK_GEO, getPolicyRate, fmtINR, todayISO,
} from "../data";

type GeoCapture = GeoPoint | null;
type Capturing = "start" | "end" | null;

interface Props {
  initial: TravelTrip | null;
  currentEmployee: string;
  currentGrade: string;
  onClose: () => void;
  onSave: (data: Partial<TravelTrip>, submit: boolean) => void;
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

// Mock GPS seed addresses
const GEO_SEEDS = Object.values(MOCK_GEO);
function mockCapture(idx: number): GeoPoint {
  const g = GEO_SEEDS[idx % GEO_SEEDS.length];
  return { ...g };
}

export default function TravelEntryForm({ initial, currentEmployee, currentGrade, onClose, onSave }: Props) {
  const [date,         setDate]         = useState(initial?.date           ?? todayISO());
  const [customer,     setCustomer]     = useState(initial?.customer        ?? "");
  const [site,         setSite]         = useState(initial?.customerSite    ?? "");
  const [purpose,      setPurpose]      = useState<VisitPurpose>(initial?.purpose ?? "Sales Visit");
  const [vehicle,      setVehicle]      = useState<VehicleType>(initial?.vehicle  ?? "Bike");
  const [project,      setProject]      = useState(initial?.project         ?? "");
  const [remarks,      setRemarks]      = useState(initial?.remarks         ?? "");
  const [billToCustomer, setBTC]        = useState(initial?.billToCustomer  ?? false);

  // Bike / Car
  const [startLoc,     setStartLoc]     = useState<GeoCapture>(initial?.startLocation ?? null);
  const [endLoc,       setEndLoc]       = useState<GeoCapture>(initial?.endLocation   ?? null);
  const [capturing,    setCapturing]    = useState<Capturing>(null);
  const [manualKm,     setManualKm]     = useState(String(initial?.payableKm ?? ""));

  // Public Transport
  const [transport,    setTransport]    = useState<TransportType>(initial?.transportType ?? "Bus");
  const [fromLoc,      setFromLoc]      = useState(initial?.fromLocation ?? "");
  const [toLoc,        setToLoc]        = useState(initial?.toLocation   ?? "");
  const [ticketAmt,    setTicketAmt]    = useState(String(initial?.ticketAmount ?? ""));
  const [hasTicket,    setHasTicket]    = useState(initial?.hasTicketAttachment ?? false);

  const [error, setError]   = useState("");

  const customerSites = MOCK_CUSTOMERS.find((c) => c.name === customer)?.sites ?? [];
  const rate = getPolicyRate(currentGrade, vehicle);
  const km   = parseFloat(manualKm) || 0;
  const claim = vehicle === "Public Transport" ? (parseFloat(ticketAmt) || 0) : km * rate;

  // Reset site when customer changes
  useEffect(() => { setSite(""); }, [customer]);
  // Auto-suggest KM once both ends captured
  useEffect(() => {
    if (startLoc && endLoc && !manualKm) {
      const stdKm = 22 + Math.floor(Math.random() * 20);
      setManualKm(String(stdKm));
    }
  }, [startLoc, endLoc]);

  function captureGPS(which: Capturing) {
    setCapturing(which);
    setTimeout(() => {
      if (which === "start") setStartLoc(mockCapture(0));
      else { setEndLoc(mockCapture(3)); }
      setCapturing(null);
    }, 800);
  }

  function validate(): boolean {
    if (!date)     { setError("Travel date is required."); return false; }
    if (!customer) { setError("Select a customer."); return false; }
    if (!purpose)  { setError("Visit purpose is required."); return false; }
    if (vehicle !== "Public Transport") {
      if (km <= 0) { setError("Enter a valid distance (KM > 0)."); return false; }
    } else {
      if (!fromLoc || !toLoc)                { setError("Enter from and to locations."); return false; }
      if (!(parseFloat(ticketAmt) > 0))      { setError("Enter the ticket amount."); return false; }
    }
    setError("");
    return true;
  }

  function handleSave(submit: boolean) {
    if (!validate()) return;
    onSave({
      date, customer, customerSite: site, purpose, vehicle, project, remarks, billToCustomer,
      startLocation: startLoc ?? undefined,
      endLocation: endLoc ?? undefined,
      distMethod: "Standard (Office → Customer)",
      standardKm: km, actualKm: km + 2.3, payableKm: km,
      ratePerKm: rate,
      transportType: vehicle === "Public Transport" ? transport : undefined,
      fromLocation: fromLoc, toLocation: toLoc,
      ticketAmount: parseFloat(ticketAmt) || 0,
      hasTicketAttachment: hasTicket,
      claimAmount: claim,
      grade: currentGrade,
      employee: currentEmployee,
      createdBy: currentEmployee,
      status: submit ? "Submitted" : "Draft",
      month: "June 2026",
      attachments: [],
    }, submit);
  }

  const VehicleIcon = vehicle === "Bike" ? Bike : vehicle === "Car" ? Car : Bus;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-header">
          <div>
            <div className="dp-title">{initial ? "Edit Trip" : "Log a Trip"}</div>
            <div className="dp-sub">Local Conveyance · {currentEmployee}</div>
          </div>
          <button className="dp-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="dp-body" style={{ gap: 20 }}>
          {/* Row 1: Date + Customer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className={labelCls}>Travel Date *</label>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Visit Purpose *</label>
              <select className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value as VisitPurpose)}>
                {VISIT_PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Customer + Site */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className={labelCls}>Customer *</label>
              <select className={inputCls} value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Select customer…</option>
                {MOCK_CUSTOMERS.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Customer Site</label>
              <select className={inputCls} value={site} onChange={(e) => setSite(e.target.value)} disabled={!customerSites.length}>
                <option value="">Select site…</option>
                {customerSites.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle type */}
          <div>
            <label className={labelCls}>Vehicle Type *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {VEHICLE_TYPES.map((v) => {
                const active = vehicle === v;
                const Icon = v === "Bike" ? Bike : v === "Car" ? Car : Bus;
                return (
                  <button key={v} type="button" onClick={() => setVehicle(v)}
                    style={{
                      border: `1.5px solid ${active ? "var(--caveo-red)" : "var(--border)"}`,
                      background: active ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                      borderRadius: 10, padding: "10px 8px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      fontFamily: "var(--font-sans)",
                    }}>
                    <Icon size={18} color={active ? "var(--caveo-red)" : "var(--fg-3)"} strokeWidth={1.7} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? "var(--caveo-red)" : "var(--fg-2)" }}>{v}</span>
                    {v !== "Public Transport" && (
                      <span style={{ fontSize: 10.5, color: "var(--fg-4)" }}>₹{getPolicyRate(currentGrade, v)}/KM</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Bike / Car section ── */}
          {vehicle !== "Public Transport" && (
            <>
              {/* GPS Capture */}
              <div>
                <label className={labelCls} style={{ marginBottom: 8 }}>Route Capture</label>
                <div className="card" style={{ padding: 0 }}>
                  <LocationRow
                    kind="start" loc={startLoc} busy={capturing === "start"}
                    onCapture={() => captureGPS("start")}
                  />
                  <div style={{ height: 1, background: "var(--border-subtle)" }} />
                  <LocationRow
                    kind="end" loc={endLoc} busy={capturing === "end"}
                    onCapture={() => captureGPS("end")}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <AlertCircle size={11} /> GPS capture is a UI placeholder — no Maps API in this build.
                </div>
              </div>

              {/* KM Calculator */}
              <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Calculator size={15} style={{ color: "var(--fg-3)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Distance &amp; Claim</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                  <div>
                    <label className={labelCls}>Distance (KM) *</label>
                    <input type="number" className={inputCls} placeholder="0.0" min="0" step="0.5"
                      value={manualKm} onChange={(e) => setManualKm(e.target.value)} />
                    {startLoc && endLoc && (
                      <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3 }}>GPS suggested · editable</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-4)", fontWeight: 700 }}>×</div>
                  <div>
                    <label className={labelCls}>Rate / KM</label>
                    <div style={{
                      border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px",
                      fontSize: 13, fontWeight: 700, background: "var(--bg-elev)", color: "var(--fg-2)",
                    }}>₹{rate} / KM <span style={{ fontSize: 10, fontWeight: 400, color: "var(--fg-4)" }}>({currentGrade})</span></div>
                  </div>
                </div>
                {km > 0 && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{km} KM × ₹{rate}/KM</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtINR(claim)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Public Transport section ── */}
          {vehicle === "Public Transport" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className={labelCls}>Transport Type</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {TRANSPORT_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setTransport(t)}
                      style={{
                        border: `1.5px solid ${transport === t ? "var(--caveo-red)" : "var(--border)"}`,
                        background: transport === t ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                        borderRadius: 999, padding: "5px 14px", cursor: "pointer",
                        fontSize: 12.5, fontWeight: 600,
                        color: transport === t ? "var(--caveo-red)" : "var(--fg-2)",
                        fontFamily: "var(--font-sans)",
                      }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className={labelCls}>From Location *</label>
                  <input type="text" className={inputCls} placeholder="Start station / stop" value={fromLoc} onChange={(e) => setFromLoc(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>To Location *</label>
                  <input type="text" className={inputCls} placeholder="End station / stop" value={toLoc} onChange={(e) => setToLoc(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
                <div>
                  <label className={labelCls}>Ticket Amount (₹) *</label>
                  <input type="number" className={inputCls} placeholder="0" min="0" value={ticketAmt} onChange={(e) => setTicketAmt(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Ticket Attachment</label>
                  <button type="button" onClick={() => setHasTicket((v) => !v)}
                    style={{
                      width: "100%", border: `1.5px solid ${hasTicket ? "var(--success)" : "var(--border)"}`,
                      background: hasTicket ? "rgba(31,157,85,0.07)" : "var(--bg-elev)",
                      borderRadius: 8, padding: "7px 12px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 7,
                      fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-sans)",
                      color: hasTicket ? "var(--success)" : "var(--fg-3)",
                    }}>
                    {hasTicket ? <CheckCircle2 size={14} /> : <Upload size={14} />}
                    {hasTicket ? "Attached" : "Upload Ticket"}
                  </button>
                </div>
              </div>
              {(parseFloat(ticketAmt) > 0) && (
                <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Claim Amount</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>{fmtINR(parseFloat(ticketAmt))}</span>
                </div>
              )}
            </div>
          )}

          {/* Project + Bill to customer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className={labelCls}>Project / Reference</label>
              <input type="text" className={inputCls} placeholder="Optional" value={project} onChange={(e) => setProject(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Bill to Customer</label>
              <button type="button" onClick={() => setBTC((v) => !v)}
                style={{
                  border: `1.5px solid ${billToCustomer ? "var(--infra-blue)" : "var(--border)"}`,
                  background: billToCustomer ? "rgba(0,102,255,0.07)" : "var(--bg-elev)",
                  borderRadius: 8, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                  color: billToCustomer ? "var(--infra-blue)" : "var(--fg-3)",
                  fontFamily: "var(--font-sans)",
                }}>
                <Users size={14} /> {billToCustomer ? "Billed" : "Not Billed"}
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea className={inputCls} rows={2} placeholder="Optional notes…" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ resize: "vertical" }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "var(--caveo-red)", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dp-footer">
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-cav btn-cav-secondary" onClick={() => handleSave(false)}>Save Draft</button>
          <button className="btn-cav btn-cav-primary" onClick={() => handleSave(true)}>Submit Trip</button>
        </div>
      </div>
    </div>
  );
}

// ─── GPS location capture row ─────────────────────────────────────────────────

function LocationRow({
  kind, loc, busy, onCapture,
}: {
  kind: "start" | "end";
  loc: GeoCapture;
  busy: boolean;
  onCapture: () => void;
}) {
  const isStart = kind === "start";
  const accent = isStart ? "var(--success)" : "var(--caveo-red)";
  const Icon = isStart ? Navigation : Navigation2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: loc ? (isStart ? "rgba(31,157,85,0.12)" : "rgba(200,16,46,0.10)") : "var(--bg-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={loc ? accent : "var(--fg-4)"} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-3)" }}>
          {isStart ? "Start Location" : "End Location"}
        </div>
        {loc ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc.address}</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · {loc.time}</div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--fg-4)", marginTop: 2 }}>Not captured</div>
        )}
      </div>
      <button type="button" onClick={onCapture} disabled={busy}
        style={{
          flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "6px 13px", borderRadius: 999,
          border: `1px solid ${loc ? "var(--border)" : accent}`,
          background: loc ? "var(--bg-elev)" : accent, color: loc ? "var(--fg-2)" : "#fff",
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "var(--font-sans)", opacity: busy ? 0.7 : 1,
        }}>
        {busy ? <SpinnerDot /> : <MapPin size={12} color={loc ? "var(--fg-2)" : "#fff"} />}
        {busy ? "Locating…" : loc ? "Recapture" : "Capture"}
      </button>
    </div>
  );
}

function SpinnerDot() {
  return (
    <div style={{
      width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)",
      borderTopColor: "#fff", borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}
