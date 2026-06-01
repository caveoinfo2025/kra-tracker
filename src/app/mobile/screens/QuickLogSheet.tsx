"use client";
import { useEffect, useRef, useState } from "react";
import MIcon from "../components/MIcon";

interface Props {
  onClose: () => void;
  onAction: (type: string) => void;
}

const ACTIONS = [
  { type: "call",    icon: "phone",    label: "Log Call",     sub: "Capture an outbound call" },
  { type: "meeting", icon: "calendar", label: "Log Meeting",  sub: "From today's calendar" },
  { type: "update",  icon: "updates",  label: "Daily Update", sub: "Post status to team" },
  { type: "lead",    icon: "doc",      label: "Scan Card",    sub: "New lead from business card" },
];

export default function QuickLogSheet({ onClose, onAction }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Dismiss on backdrop click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="m-sheet-overlay" onClick={handleOverlayClick}>
      <div className="m-sheet-body" ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className="m-sheet-grabber" />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.01em" }}>
          Quick log
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ACTIONS.map(a => (
            <button
              key={a.type}
              onClick={() => onAction(a.type)}
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(200, 16, 46, 0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MIcon name={a.icon} size={16} color="var(--caveo-red)" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", fontFamily: "var(--font-sans)" }}>
                {a.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500, fontFamily: "var(--font-sans)" }}>
                {a.sub}
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>
            Quick links
          </div>
          <a
            href="/collections"
            style={{ display: "flex", alignItems: "center", padding: "10px 0", gap: 10, borderBottom: "1px solid var(--border-subtle)", textDecoration: "none" }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="doc" size={14} color="var(--fg-3)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)", fontFamily: "var(--font-sans)" }}>Collections</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-sans)" }}>View invoices & payments</div>
            </div>
            <MIcon name="chev" size={14} color="var(--fg-4)" />
          </a>
          <a
            href="/kras"
            style={{ display: "flex", alignItems: "center", padding: "10px 0", gap: 10, borderBottom: "1px solid var(--border-subtle)", textDecoration: "none" }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="target" size={14} color="var(--fg-3)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)", fontFamily: "var(--font-sans)" }}>KRAs</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-sans)" }}>Review targets & score</div>
            </div>
            <MIcon name="chev" size={14} color="var(--fg-4)" />
          </a>
          <a
            href="/import"
            style={{ display: "flex", alignItems: "center", padding: "10px 0", gap: 10, textDecoration: "none" }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="attach" size={14} color="var(--fg-3)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)", fontFamily: "var(--font-sans)" }}>Import Data</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-sans)" }}>Upload collections CSV</div>
            </div>
            <MIcon name="chev" size={14} color="var(--fg-4)" />
          </a>
        </div>
      </div>
    </div>
  );
}
