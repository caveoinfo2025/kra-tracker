"use client";

import { X, MapPin, Bike, Car, Bus, Navigation, Navigation2, CheckCircle2, Users, Edit2 } from "lucide-react";
import { TravelTrip, ConveyanceCaps, tripBadge, fmtINR, fmtDate, fmtKM } from "../data";
import ExpenseApprovalTimeline from "../../expenses/components/ExpenseApprovalTimeline";

interface Props {
  trip: TravelTrip;
  caps: ConveyanceCaps;
  onClose: () => void;
  onEdit: (t: TravelTrip) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onRequestClarification: (id: number) => void;
}

export default function TravelEntryDrawer({ trip, caps, onClose, onEdit, onApprove, onReject, onRequestClarification }: Props) {
  const VIcon = trip.vehicle === "Bike" ? Bike : trip.vehicle === "Car" ? Car : Bus;
  const isPT  = trip.vehicle === "Public Transport";

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="dp-title">{trip.tripNo}</div>
              <span className={`badge ${tripBadge(trip.status)}`}>{trip.status}</span>
            </div>
            <div className="dp-sub">{trip.employee} · {fmtDate(trip.date)}</div>
          </div>
          <button className="dp-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="dp-body">
          {/* Trip summary strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
            <MetaCell label="Customer"  value={trip.customer} sub={trip.customerSite} />
            <MetaCell label="Purpose"   value={trip.purpose} />
            <MetaCell label="Vehicle"   value={trip.vehicle} icon={<VIcon size={14} strokeWidth={1.7} />} />
          </div>

          {/* Distance / claim */}
          {!isPT ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <KpiCell label="Payable KM"   value={fmtKM(trip.payableKm)} />
              <KpiCell label="Rate / KM"    value={`₹${trip.ratePerKm}`} />
              <KpiCell label="Claim Amount" value={fmtINR(trip.claimAmount)} accent />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <KpiCell label="Transport" value={trip.transportType ?? "—"} />
              <KpiCell label="Ticket Amount" value={fmtINR(trip.claimAmount)} accent />
            </div>
          )}

          {/* Route */}
          {!isPT && (trip.startLocation || trip.endLocation) && (
            <Section title="Route">
              {trip.startLocation && (
                <LocationRow icon={<Navigation size={13} color="var(--success)" />} label="Start" geo={trip.startLocation} />
              )}
              {trip.endLocation && (
                <LocationRow icon={<Navigation2 size={13} color="var(--caveo-red)" />} label="End" geo={trip.endLocation} />
              )}
              <div style={{ display: "flex", gap: 20, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)", fontSize: 12 }}>
                <span style={{ color: "var(--fg-3)" }}>Standard KM: <b>{fmtKM(trip.standardKm)}</b></span>
                <span style={{ color: "var(--fg-3)" }}>GPS Actual: <b>{fmtKM(trip.actualKm)}</b></span>
                <span style={{ color: "var(--fg-3)" }}>Policy: <b>{trip.distMethod.split(" ")[0]}</b></span>
              </div>
            </Section>
          )}

          {/* Public transport route */}
          {isPT && (trip.fromLocation || trip.toLocation) && (
            <Section title="Route">
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{trip.fromLocation}</span>
                <span style={{ color: "var(--fg-4)" }}>→</span>
                <span style={{ fontWeight: 600 }}>{trip.toLocation}</span>
              </div>
              {trip.hasTicketAttachment && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--success)", display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} /> Ticket attached
                </div>
              )}
            </Section>
          )}

          {/* Customer profitability */}
          {trip.billToCustomer && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,102,255,0.06)", border: "1px solid rgba(0,102,255,0.18)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5 }}>
              <Users size={14} color="var(--infra-blue)" />
              <span style={{ color: "var(--infra-blue)", fontWeight: 600 }}>Billed to customer —</span>
              <span style={{ color: "var(--fg-2)" }}>{trip.customer}</span>
              {trip.project && <span style={{ color: "var(--fg-4)" }}>· {trip.project}</span>}
            </div>
          )}

          {/* Remarks */}
          {trip.remarks && (
            <Section title="Remarks">
              <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>{trip.remarks}</p>
            </Section>
          )}

          {/* Manager / accounts notes */}
          {(trip.managerNote || trip.accountsNote) && (
            <Section title="Review Notes">
              {trip.managerNote   && <Note who="Manager"  note={trip.managerNote} />}
              {trip.accountsNote  && <Note who="Accounts" note={trip.accountsNote} />}
            </Section>
          )}

          {/* Approval timeline */}
          {trip.approvalHistory.length > 0 && (
            <Section title="Approval Timeline">
              <ExpenseApprovalTimeline history={trip.approvalHistory} />
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div className="dp-footer">
          {/* Employee: edit if draft/rejected */}
          {caps.canAdd && (trip.status === "Draft" || trip.status === "Rejected") && (
            <button className="btn-cav btn-cav-secondary" onClick={() => onEdit(trip)}>
              <Edit2 size={13} /> Edit Trip
            </button>
          )}
          {/* Manager: approve / reject / clarify */}
          {caps.canApprove && trip.status === "Submitted" && (
            <>
              <button className="btn-cav btn-cav-secondary" onClick={() => onRequestClarification(trip.id)}>
                Request Clarification
              </button>
              <button
                className="btn-cav btn-cav-secondary"
                style={{ color: "var(--caveo-red)", borderColor: "rgba(200,16,46,0.3)" }}
                onClick={() => onReject(trip.id)}
              >✗ Reject</button>
              <button
                className="btn-cav btn-cav-primary"
                style={{ background: "var(--success)", border: "none" }}
                onClick={() => onApprove(trip.id)}
              >✓ Approve</button>
            </>
          )}
          {/* Accounts: verify */}
          {caps.canVerify && trip.status === "Approved" && (
            <button className="btn-cav btn-cav-primary" onClick={() => onApprove(trip.id)}>
              Mark Verified
            </button>
          )}
          <button className="btn-cav btn-cav-secondary" onClick={onClose} style={{ marginLeft: "auto" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-4)", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function MetaCell({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-muted)", padding: "10px 14px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-4)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", display: "flex", alignItems: "center", gap: 5 }}>{icon}{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function KpiCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "kpi kpi-accent" : "kpi"} style={{ padding: "12px 14px" }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}

function LocationRow({ icon, label, geo }: { icon: React.ReactNode; label: string; geo: { address: string; lat: number; lng: number; time: string } }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0" }}>
      <div style={{ marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, color: "var(--fg-4)", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-1)" }}>{geo.address}</div>
        <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} · {geo.time}</div>
      </div>
    </div>
  );
}

function Note({ who, note }: { who: string; note: string }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 12.5, marginBottom: 6 }}>
      <span style={{ fontWeight: 600, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{who}:</span>
      <span style={{ color: "var(--fg-2)" }}>{note}</span>
    </div>
  );
}
