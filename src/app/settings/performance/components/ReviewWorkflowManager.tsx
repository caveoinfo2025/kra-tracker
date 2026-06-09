"use client";

import { useState, useEffect } from "react";

type Review = {
  id: number;
  employeeTargetId: number;
  reviewerId: number;
  selfRating: number;
  managerRating: number;
  finalRating: number;
  status: string;
  comments: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:        { label: "Draft",        color: "#6b7280", bg: "#f3f4f6" },
  SUBMITTED:    { label: "Submitted",    color: "#0ea5e9", bg: "#e0f2fe" },
  UNDER_REVIEW: { label: "Under Review", color: "#f59e0b", bg: "#fef9c3" },
  APPROVED:     { label: "Approved",     color: "#22c55e", bg: "#dcfce7" },
  REJECTED:     { label: "Rejected",     color: "#dc2626", bg: "#fee2e2" },
};

export default function ReviewWorkflowManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const url = statusFilter
      ? `/api/admin/performance/reviews?status=${statusFilter}`
      : "/api/admin/performance/reviews";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function updateStatus(id: number, status: string) {
    await fetch("/api/admin/performance/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Review Workflows</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABELS).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No performance reviews found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reviews.map((r) => {
            const st = STATUS_LABELS[r.status] ?? { label: r.status, color: "#6b7280", bg: "#f3f4f6" };
            return (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Review #{r.id} — Target #{r.employeeTargetId}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      Reviewer #{r.reviewerId} · Self: {r.selfRating.toFixed(1)} · Manager: {r.managerRating.toFixed(1)} · Final: {r.finalRating.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, background: st.bg, color: st.color, borderRadius: 12, padding: "3px 10px" }}>
                      {st.label}
                    </span>
                    {r.status === "SUBMITTED" && (
                      <button
                        onClick={() => updateStatus(r.id, "UNDER_REVIEW")}
                        style={{ fontSize: 12, background: "#fef9c3", color: "#713f12", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                        Start Review
                      </button>
                    )}
                    {r.status === "UNDER_REVIEW" && (
                      <>
                        <button
                          onClick={() => updateStatus(r.id, "APPROVED")}
                          style={{ fontSize: 12, background: "#dcfce7", color: "#15803d", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "REJECTED")}
                          style={{ fontSize: 12, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {r.comments && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#374151", borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                    {r.comments}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
