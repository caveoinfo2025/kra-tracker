"use client";
import { useState } from "react";
import MIcon from "../components/MIcon";

interface Props {
  onBack: () => void;
  onSubmitted?: (msg: string) => void;
}

// Mock data (design only — no backend, no Google API)
const CUSTOMERS = [
  "Tata Projects Ltd", "Infosys BPM", "Wipro Ltd", "L&T Construction",
  "Biocon", "Manyata Tech Park", "Embassy GolfLinks",
];

const VEHICLES = [
  { key: "Bike", icon: "route", rate: 4 },
  { key: "Car", icon: "car", rate: 10 },
  { key: "Auto", icon: "car", rate: 7 },
];

// Mock captured addresses (rotated as a stand-in for real GPS / Maps capture)
const MOCK_PLACES = [
  "Caveo Office, Indiranagar",
  "Manyata Tech Park, Nagawara",
  "Embassy GolfLinks, Domlur",
  "Whitefield ITPL Main Rd",
  "Electronic City Phase 1",
];

type Captured = { label: string; lat: string; lng: string } | null;

function mockCapture(seed: number): Captured {
  const place = MOCK_PLACES[seed % MOCK_PLACES.length];
  // Deterministic pseudo-coordinates around Bengaluru (display only)
  const lat = (12.95 + seed * 0.012).toFixed(5);
  const lng = (77.62 + seed * 0.009).toFixed(5);
  return { label: place, lat, lng };
}

export default function ConveyanceScreen({ onBack, onSubmitted }: Props) {
  const [customer, setCustomer] = useState("");
  const [vehicle, setVehicle] = useState("Bike");
  const [start, setStart] = useState<Captured>(null);
  const [end, setEnd] = useState<Captured>(null);
  const [km, setKm] = useState("");
  const [capturing, setCapturing] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const rate = VEHICLES.find((v) => v.key === vehicle)?.rate ?? 0;
  const kmNum = parseFloat(km) || 0;
  const claim = kmNum * rate;

  function capture(which: "start" | "end") {
    setCapturing(which);
    // Simulate a brief GPS acquisition (no Google API).
    setTimeout(() => {
      const seed = which === "start" ? 0 : 3;
      const loc = mockCapture(seed);
      if (which === "start") setStart(loc);
      else {
        setEnd(loc);
        // Auto-suggest a distance once both ends exist (mock, editable).
        setKm((prev) => (prev ? prev : "12.4"));
      }
      setCapturing(null);
    }, 700);
  }

  function submit() {
    setError("");
    if (!customer) return setError("Select a customer.");
    if (!start) return setError("Capture the start location.");
    if (!end) return setError("Capture the end location.");
    if (!(kmNum > 0)) return setError("Distance must be greater than zero.");
    setDone(true);
    onSubmitted?.("Conveyance claim submitted");
  }

  if (done) {
    return (
      <div className="m-screen m-screen-enter">
        <div className="m-content">
          <div className="m-navbar">
            <button className="m-back" onClick={onBack}><MIcon name="back" size={18} /> Back</button>
            <div className="m-nav-title">Local Conveyance</div>
            <div style={{ width: 36 }} />
          </div>
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 18px",
              background: "rgba(31,157,85,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MIcon name="check" size={36} color="var(--success)" />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>Trip submitted</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-3)", marginTop: 8, lineHeight: 1.5 }}>
              {kmNum} km by {vehicle.toLowerCase()} · claim of{" "}
              <b style={{ color: "var(--fg-1)" }}>₹{claim.toLocaleString("en-IN")}</b> sent for approval.
              (UI preview — not saved yet.)
            </div>
            <button className="m-btn" style={{ marginTop: 28 }} onClick={onBack}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}><MIcon name="back" size={18} /> Back</button>
          <div className="m-nav-title">Local Conveyance</div>
          <div style={{ width: 36 }} />
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">Finance</div>
          <h1 className="m-title">Log a Trip</h1>
          <div className="m-subtitle">Capture start &amp; end points — claim is auto-calculated by distance.</div>
        </div>

        {/* Customer */}
        <div className="m-section">
          <label className="m-field-label">Customer / Purpose</label>
          <select className="m-input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">Select customer…</option>
            {CUSTOMERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Vehicle */}
        <div className="m-section">
          <label className="m-field-label">Vehicle</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {VEHICLES.map((v) => {
              const active = vehicle === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setVehicle(v.key)}
                  style={{
                    border: `1.5px solid ${active ? "var(--caveo-red)" : "var(--border)"}`,
                    background: active ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                    borderRadius: 12, padding: "12px 6px", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <MIcon name={v.icon} size={19} color={active ? "var(--caveo-red)" : "var(--fg-3)"} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? "var(--caveo-red)" : "var(--fg-2)" }}>{v.key}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-4)" }}>₹{v.rate}/km</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location capture */}
        <div className="m-section">
          <label className="m-field-label">Route</label>
          <div className="m-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Start */}
            <LocationRow
              kind="start" loc={start} busy={capturing === "start"}
              onCapture={() => capture("start")}
            />
            <div style={{ height: 1, background: "var(--border-subtle)" }} />
            {/* End */}
            <LocationRow
              kind="end" loc={end} busy={capturing === "end"}
              onCapture={() => capture("end")}
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <MIcon name="alert" size={12} color="var(--fg-4)" />
            Location capture is a placeholder — no maps integration in this build.
          </div>
        </div>

        {/* KM + Claim */}
        <div className="m-section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="m-kpi">
              <div className="m-kpi-label">Distance</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <input
                  type="number" inputMode="decimal" min="0" step="0.1" value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="0.0"
                  style={{
                    width: "100%", border: "none", outline: "none", background: "transparent",
                    fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700,
                    color: "var(--fg-1)", padding: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>km</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>
                {start && end ? "Auto-suggested · editable" : "Capture both points"}
              </div>
            </div>
            <div className="m-kpi m-kpi-accent">
              <div className="m-kpi-label">Claim Amount</div>
              <div className="m-kpi-value" style={{ fontSize: 24 }}>
                ₹{claim.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>
                {kmNum} km × ₹{rate}/km
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-section">
            <div style={{
              background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)",
              borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "var(--caveo-red)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <MIcon name="alert" size={15} color="var(--caveo-red)" /> {error}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="m-section">
          <button className="m-btn" onClick={submit}>
            <MIcon name="check" size={17} color="#fff" /> Submit Claim
            {claim > 0 ? ` · ₹${claim.toLocaleString("en-IN")}` : ""}
          </button>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

// ─── Location capture row ─────────────────────────────────────────────────────

function LocationRow({
  kind, loc, busy, onCapture,
}: {
  kind: "start" | "end";
  loc: { label: string; lat: string; lng: string } | null;
  busy: boolean;
  onCapture: () => void;
}) {
  const isStart = kind === "start";
  const accent = isStart ? "var(--success)" : "var(--caveo-red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: loc ? (isStart ? "rgba(31,157,85,0.12)" : "rgba(200,16,46,0.10)") : "var(--bg-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <MIcon name="pin" size={17} color={loc ? accent : "var(--fg-4)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
          {isStart ? "Start location" : "End location"}
        </div>
        {loc ? (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {loc.label}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{loc.lat}, {loc.lng}</div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--fg-4)", marginTop: 2 }}>Not captured yet</div>
        )}
      </div>
      <button
        onClick={onCapture}
        disabled={busy}
        style={{
          flexShrink: 0, border: `1px solid ${loc ? "var(--border)" : accent}`,
          background: loc ? "var(--bg-elev)" : accent, color: loc ? "var(--fg-2)" : "#fff",
          borderRadius: 999, padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans)",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? (
          <span className="m-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
        ) : (
          <MIcon name="pin" size={13} color={loc ? "var(--fg-2)" : "#fff"} />
        )}
        {busy ? "Locating…" : loc ? "Recapture" : "Capture"}
      </button>
    </div>
  );
}
