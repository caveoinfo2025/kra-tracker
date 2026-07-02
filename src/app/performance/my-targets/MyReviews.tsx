"use client";

/**
 * Phase W11 — PerformanceReview UI on top of converted Enterprise KRA `KRAAchievement` rows.
 *
 * Employee: "My Performance Reviews" (self-scoped, read + self-review submission only).
 * Manager: additional "Team Reviews" section — candidates ready for review (Create/Reopen action),
 * plus existing reviews with a manager rating/finalization action. No conversion controls here
 * (that is Phase W10, on AchievementPreview). Employees never see manager/candidate controls.
 */
import { useCallback, useEffect, useState } from "react";

type ReviewComments = { selfRemarks?: string; managerRemarks?: string; legacy?: string };

type MyReview = {
  reviewId: number;
  period: string;
  status: string;
  selfRating: number;
  managerRating: number;
  finalRating: number;
  comments: ReviewComments;
  achievementSummary: { achievementCount: number; totalWeightedScore: number };
};

type Candidate = {
  employeeProfileId: number;
  employeeTargetId: number | null;
  employeeName: string;
  periodId: number | null;
  periodName: string;
  achievementCount: number;
  totalWeightedScore: number;
  existingReviewId: number | null;
  existingReviewStatus: string | null;
  candidateStatus: "NO_TARGET" | "NO_CONVERTED_ACHIEVEMENTS" | "ALREADY_REVIEWED" | "READY";
};

type AdminReview = {
  id: number;
  employeeTargetId: number;
  reviewerId: number;
  selfRating: number;
  managerRating: number;
  finalRating: number;
  status: string;
  comments: string;
  employeeName: string | null;
  periodName: string | null;
  achievementCount: number;
  totalWeightedScore: number;
};

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: "#f3f4f6", fg: "#6b7280" },
  SELF_SUBMITTED: { bg: "#e0f2fe", fg: "#0369a1" },
  SUBMITTED: { bg: "#e0f2fe", fg: "#0369a1" },
  UNDER_REVIEW: { bg: "#fef9c3", fg: "#854d0e" },
  APPROVED: { bg: "#dcfce7", fg: "#15803d" },
  REJECTED: { bg: "#fee2e2", fg: "#dc2626" },
};
function StatusChip({ status }: { status: string }) {
  const c = STATUS_STYLES[status] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  return <span style={{ fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>{status}</span>;
}

/** Tolerant parse mirroring performance-review.ts's parseReviewComments — a pre-existing
 *  plain-text comments value (from the older generic review engine) has no managerRemarks key,
 *  which is fine, the field just comes back undefined. */
function parseManagerRemarks(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.managerRemarks === "string") return parsed.managerRemarks;
  } catch { /* legacy plain text — no managerRemarks to prepopulate */ }
  return "";
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 12 };
const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 8px", fontSize: 13 };

// ── Employee: self-review card ───────────────────────────────────────────────────

function MyReviewCard({ r, onSubmitted }: { r: MyReview; onSubmitted: () => void }) {
  const [selfRating, setSelfRating] = useState(r.selfRating || 0);
  const [selfRemarks, setSelfRemarks] = useState(r.comments.selfRemarks ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editable = r.status !== "APPROVED";

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/performance/my-reviews/${r.reviewId}/self-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfRating, selfRemarks }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Failed (${res.status})`);
      }
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit self-review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{r.period}</strong>
        <StatusChip status={r.status} />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          {r.achievementSummary.achievementCount} achievement(s) · weighted score {r.achievementSummary.totalWeightedScore}
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 10, color: "#374151" }}>
        <span>Self rating: <strong>{r.selfRating || "—"}</strong></span>
        <span>Manager rating: <strong>{r.managerRating || "—"}</strong></span>
        <span>Final rating: <strong>{r.finalRating || "—"}</strong></span>
      </div>

      {r.comments.managerRemarks && (
        <div style={{ fontSize: 13, color: "#374151", background: "#f9fafb", borderRadius: 6, padding: 8, marginBottom: 8 }}>
          <strong>Manager remarks:</strong> {r.comments.managerRemarks}
        </div>
      )}

      {editable ? (
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#374151" }}>Self rating&nbsp;
              <input type="number" min={0} max={5} step={0.5} value={selfRating}
                onChange={(e) => setSelfRating(Number(e.target.value))}
                style={{ ...input, width: 64, marginLeft: 4 }} />
            </label>
          </div>
          <textarea value={selfRemarks} onChange={(e) => setSelfRemarks(e.target.value)} rows={2}
            placeholder="Your self-review remarks…"
            style={{ width: "100%", ...input, resize: "vertical", marginBottom: 8 }} />
          {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <button onClick={submit} disabled={submitting}
            style={{ background: "#CC2229", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Submitting…" : "Submit Self-Review"}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#9ca3af" }}>This review is finalized — self-review is locked.</div>
      )}
    </div>
  );
}

// ── Manager: candidate row ────────────────────────────────────────────────────────

function CandidateRow({ c, onDone }: { c: Candidate; onDone: () => void }) {
  const [mode, setMode] = useState<"CREATE_ONLY" | "REOPEN_EXISTING">("CREATE_ONLY");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function createReview() {
    setSubmitting(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/admin/performance/reviews/create-from-achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeProfileId: c.employeeProfileId, ...(c.periodId ? { periodId: c.periodId } : {}), mode, remarks }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Failed (${res.status})`);
      setResult(`${body.outcome}${body.reason ? ` — ${body.reason}` : ""}`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create review");
    } finally {
      setSubmitting(false);
    }
  }

  const canAct = c.candidateStatus === "READY" || c.candidateStatus === "ALREADY_REVIEWED";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ minWidth: 160 }}>
        <strong style={{ fontSize: 13 }}>{c.employeeName}</strong>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{c.periodName || "No period"}</div>
      </div>
      <span style={{ fontSize: 12, color: "#374151" }}>{c.achievementCount} achievement(s) · score {c.totalWeightedScore}</span>
      <span style={{ fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#6b7280", borderRadius: 4, padding: "2px 6px" }}>
        {c.candidateStatus.replace(/_/g, " ")}
      </span>
      {canAct && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          {c.candidateStatus === "ALREADY_REVIEWED" && (
            <select value={mode} onChange={(e) => setMode(e.target.value as "CREATE_ONLY" | "REOPEN_EXISTING")} style={{ ...input, fontSize: 12 }}>
              <option value="CREATE_ONLY">Create only</option>
              <option value="REOPEN_EXISTING">Reopen existing</option>
            </select>
          )}
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)"
            style={{ ...input, fontSize: 12, width: 160 }} />
          <button onClick={createReview} disabled={submitting}
            style={{ background: "#CC2229", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "…" : c.candidateStatus === "ALREADY_REVIEWED" ? "Apply" : "Create Review"}
          </button>
        </div>
      )}
      {(error || result) && <div style={{ width: "100%", fontSize: 12, color: error ? "#dc2626" : "#15803d" }}>{error || result}</div>}
    </div>
  );
}

// ── Manager: existing review row (rating/finalization action) ───────────────────

function AdminReviewRow({ r, onUpdated }: { r: AdminReview; onUpdated: () => void }) {
  const [managerRating, setManagerRating] = useState(r.managerRating || 0);
  const [finalRating, setFinalRating] = useState(r.finalRating || 0);
  const [managerRemarks, setManagerRemarks] = useState(() => parseManagerRemarks(r.comments));
  const [status, setStatus] = useState(r.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(nextStatus?: string) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/performance/reviews/${r.id}/manager-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerRating, finalRating, managerRemarks, status: nextStatus ?? status }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Failed (${res.status})`);
      }
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit manager review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...card, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{r.employeeName ?? `Target #${r.employeeTargetId}`}</strong>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{r.periodName}</span>
        <StatusChip status={status} />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          {r.achievementCount} achievement(s) · score {r.totalWeightedScore}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <label style={{ fontSize: 12 }}>Manager rating&nbsp;
          <input type="number" min={0} max={5} step={0.5} value={managerRating} onChange={(e) => setManagerRating(Number(e.target.value))} style={{ ...input, width: 64, marginLeft: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Final rating&nbsp;
          <input type="number" min={0} max={5} step={0.5} value={finalRating} onChange={(e) => setFinalRating(Number(e.target.value))} style={{ ...input, width: 64, marginLeft: 4 }} />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...input, fontSize: 12 }}>
          {["DRAFT", "SELF_SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea value={managerRemarks} onChange={(e) => setManagerRemarks(e.target.value)} rows={2}
        placeholder="Manager remarks…" style={{ width: "100%", ...input, resize: "vertical", marginBottom: 8 }} />
      {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => submit()} disabled={submitting}
          style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
          Save
        </button>
        <button onClick={() => submit("APPROVED")} disabled={submitting}
          style={{ background: "#15803d", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
          Finalize (Approve)
        </button>
      </div>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────────

export default function MyReviews({ isManager }: { isManager: boolean }) {
  const [mine, setMine] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(isManager);
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]);
  const [adminLoading, setAdminLoading] = useState(isManager);

  const loadMine = useCallback(() => {
    setLoading(true);
    fetch("/api/performance/my-reviews")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMine(Array.isArray(d.reviews) ? d.reviews : []))
      .catch(() => setMine([]))
      .finally(() => setLoading(false));
  }, []);

  const loadManager = useCallback(() => {
    if (!isManager) return;
    setCandidatesLoading(true);
    fetch("/api/admin/performance/reviews/candidates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCandidates(Array.isArray(d.candidates) ? d.candidates : []))
      .catch(() => setCandidates([]))
      .finally(() => setCandidatesLoading(false));

    setAdminLoading(true);
    fetch("/api/admin/performance/reviews")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAdminReviews(Array.isArray(d) ? d : []))
      .catch(() => setAdminReviews([]))
      .finally(() => setAdminLoading(false));
  }, [isManager]);

  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { loadManager(); }, [loadManager]);

  // Phase W11.2 — AchievementPreview's conversion action lives in a separate component with its
  // own fetch state; it dispatches this event so the candidates list refreshes without requiring
  // a manual page reload. Does not trigger any conversion/creation itself — read-only refresh.
  useEffect(() => {
    if (!isManager) return;
    const handler = () => loadManager();
    window.addEventListener("enterprise-kra-converted", handler);
    return () => window.removeEventListener("enterprise-kra-converted", handler);
  }, [isManager, loadManager]);

  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>My Performance Reviews</h2>
      <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 13 }}>
        Reviews are created by your manager once your KRA achievements are converted. You may submit
        a self-review while it is not yet finalized.
      </p>
      {loading ? (
        <div style={{ ...card, color: "#9ca3af", fontSize: 14 }}>Loading…</div>
      ) : mine.length === 0 ? (
        <div style={{ ...card, color: "#9ca3af", fontSize: 14 }}>No performance reviews yet.</div>
      ) : (
        mine.map((r) => <MyReviewCard key={r.reviewId} r={r} onSubmitted={loadMine} />)
      )}

      {isManager && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Team Reviews</h2>
          <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 13 }}>
            Employees with converted KRA achievements ready for review. Creating a review is an
            explicit action — nothing is created automatically.
          </p>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Candidates</div>
            {candidatesLoading ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</div>
            ) : candidates.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>No direct reports found.</div>
            ) : (
              candidates.map((c) => <CandidateRow key={c.employeeProfileId} c={c} onDone={loadManager} />)
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Existing Reviews</div>
            {adminLoading ? (
              <div style={{ ...card, color: "#9ca3af", fontSize: 13 }}>Loading…</div>
            ) : adminReviews.length === 0 ? (
              <div style={{ ...card, color: "#9ca3af", fontSize: 13 }}>No reviews created yet.</div>
            ) : (
              adminReviews.map((r) => <AdminReviewRow key={r.id} r={r} onUpdated={loadManager} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
