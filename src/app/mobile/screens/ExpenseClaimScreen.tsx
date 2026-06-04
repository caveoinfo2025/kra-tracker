"use client";
import { useRef, useState } from "react";
import MIcon from "../components/MIcon";

interface Props {
  onBack: () => void;
  onSubmitted?: (msg: string) => void;
}

const CATEGORIES = [
  { key: "Travel", icon: "car" },
  { key: "Meals", icon: "receipt" },
  { key: "Accommodation", icon: "pin" },
  { key: "Office Supplies", icon: "doc" },
  { key: "Communication", icon: "phone" },
  { key: "Other", icon: "more" },
];

const inputStyle: React.CSSProperties = {};

export default function ExpenseClaimScreen({ onBack, onSubmitted }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);

  function handlePhoto(file: File | undefined) {
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
  }

  function submit() {
    setError("");
    if (!category) return setError("Select a category.");
    if (!(parseFloat(amount) > 0)) return setError("Enter an amount greater than zero.");
    if (!description.trim()) return setError("Add a short description.");
    // Design only — no backend. Show success state.
    setDone(true);
    onSubmitted?.("Expense claim submitted");
  }

  const amt = parseFloat(amount) || 0;

  if (done) {
    return (
      <div className="m-screen m-screen-enter">
        <div className="m-content">
          <div className="m-navbar">
            <button className="m-back" onClick={onBack}><MIcon name="back" size={18} /> Back</button>
            <div className="m-nav-title">Expense Claim</div>
            <div style={{ width: 36 }} />
          </div>
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 18px",
              background: "rgba(31,157,85,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MIcon name="check" size={36} color="var(--success)" />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>Claim submitted</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-3)", marginTop: 8, lineHeight: 1.5 }}>
              Your {category.toLowerCase()} expense of <b style={{ color: "var(--fg-1)" }}>₹{amt.toLocaleString("en-IN")}</b> has
              been sent for approval. (UI preview — not saved yet.)
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
          <div className="m-nav-title">Expense Claim</div>
          <div style={{ width: 36 }} />
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">Finance</div>
          <h1 className="m-title">New Expense</h1>
          <div className="m-subtitle">Capture a bill, pick a category, and submit for approval.</div>
        </div>

        {/* Bill photo capture */}
        <div className="m-section">
          <label className="m-field-label">Bill / Receipt</label>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
          {photo ? (
            <div className="m-card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Bill" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
              <button
                onClick={() => cameraRef.current?.click()}
                style={{
                  position: "absolute", bottom: 10, right: 10,
                  background: "rgba(15,17,21,0.7)", color: "#fff", border: "none",
                  borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <MIcon name="camera" size={14} color="#fff" /> Retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => cameraRef.current?.click()}
              style={{
                width: "100%", border: "1.5px dashed var(--border-strong)", borderRadius: 14,
                background: "var(--bg-elev)", padding: "28px 16px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                fontFamily: "var(--font-sans)",
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: "rgba(200,16,46,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MIcon name="camera" size={24} color="var(--caveo-red)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>Capture bill photo</div>
              <div style={{ fontSize: 12, color: "var(--fg-4)" }}>Tap to open camera or pick from gallery</div>
            </button>
          )}
        </div>

        {/* Category */}
        <div className="m-section">
          <label className="m-field-label">Category</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  style={{
                    border: `1.5px solid ${active ? "var(--caveo-red)" : "var(--border)"}`,
                    background: active ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                    borderRadius: 12, padding: "12px 6px", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <MIcon name={c.icon} size={19} color={active ? "var(--caveo-red)" : "var(--fg-3)"} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: active ? "var(--caveo-red)" : "var(--fg-2)", textAlign: "center", lineHeight: 1.2 }}>
                    {c.key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount + Date */}
        <div className="m-section">
          <div className="m-field">
            <label className="m-field-label">Amount (₹)</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              className="m-input" placeholder="0.00" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}
            />
          </div>
          <div className="m-field">
            <label className="m-field-label">Expense Date</label>
            <input type="date" className="m-input" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div className="m-field" style={{ marginBottom: 0 }}>
            <label className="m-field-label">Description</label>
            <textarea
              className="m-textarea" placeholder="What was this expense for?"
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: 72 }}
            />
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
            {amt > 0 ? ` · ₹${amt.toLocaleString("en-IN")}` : ""}
          </button>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
