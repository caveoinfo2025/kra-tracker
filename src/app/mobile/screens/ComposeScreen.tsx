"use client";
import { useState } from "react";
import MIcon from "../components/MIcon";

interface Props {
  userName: string;
  onBack: () => void;
  onPosted: () => void;
}

type Status = "On Track" | "Needs Support" | "At Risk";

export default function ComposeScreen({ userName, onBack, onPosted }: Props) {
  const [status, setStatus] = useState<Status>("On Track");
  const [topUpdates, setTopUpdates] = useState("");
  const [keyMovement, setKeyMovement] = useState("");
  const [blockers, setBlockers] = useState("");
  const [posting, setPosting] = useState(false);

  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  async function handlePost() {
    if (!topUpdates.trim()) {
      alert("Please add your top updates before posting.");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/daily-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString(),
          topUpdates: topUpdates.trim(),
          keyMovement: keyMovement.trim(),
          blockers: blockers.trim(),
          updateStatus: status,
        }),
      });
      if (!res.ok) throw new Error("Failed to post");
      onPosted();
    } catch {
      alert("Failed to post update. Please try again.");
    }
    setPosting(false);
  }

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content">
        {/* Navbar */}
        <div className="m-navbar">
          <button
            style={{ fontSize: 14, color: "var(--fg-3)", padding: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            onClick={onBack}
          >
            Cancel
          </button>
          <div className="m-nav-title">New Update</div>
          <button
            style={{ fontSize: 14, color: posting ? "var(--fg-4)" : "var(--caveo-red)", fontWeight: 600, padding: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            onClick={handlePost}
            disabled={posting}
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>

        <div className="m-section">
          <div className="m-card">
            {/* Author */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="m-avatar lg" style={{ background: "#0046B0" }}>{initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{userName}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{today}</div>
              </div>
            </div>

            {/* Status */}
            <div className="m-field">
              <label className="m-field-label">Status</label>
              <div className="m-seg">
                {(["On Track", "Needs Support", "At Risk"] as Status[]).map(s => (
                  <button
                    key={s}
                    className={status === s ? "active" : ""}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Top updates */}
            <div className="m-field">
              <label className="m-field-label">Today's top updates</label>
              <textarea
                className="m-textarea"
                placeholder="What did you accomplish today? Any key wins or progress..."
                value={topUpdates}
                onChange={e => setTopUpdates(e.target.value)}
              />
            </div>

            {/* Key movement */}
            <div className="m-field">
              <label className="m-field-label">Key Movement</label>
              <input
                className="m-input"
                placeholder="e.g. HDFC MDR/XDR → Negotiation 75%"
                value={keyMovement}
                onChange={e => setKeyMovement(e.target.value)}
              />
            </div>

            {/* Blockers */}
            <div className="m-field">
              <label className="m-field-label">Blockers (optional)</label>
              <input
                className="m-input"
                placeholder="Anything blocking your progress?"
                value={blockers}
                onChange={e => setBlockers(e.target.value)}
              />
            </div>

            {/* Attach / voice */}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="m-action" style={{ flex: 1 }}>
                <div className="ico"><MIcon name="attach" size={14} color="var(--caveo-red)" /></div>
                Attach
              </button>
              <button className="m-action" style={{ flex: 1 }}>
                <div className="ico"><MIcon name="mic" size={14} color="var(--caveo-red)" /></div>
                Voice note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
