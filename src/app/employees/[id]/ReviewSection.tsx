"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import type { EmployeeSerialized, ReviewSerialized } from "@/lib/types";

type Employee = Pick<EmployeeSerialized, "id" | "kras">;

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function ReviewSection({ employee }: { employee: Employee }) {
  const router = useRouter();
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const [showForm, setShowForm] = useState(false);
  const [editReview, setEditReview] = useState<ReviewSerialized | null>(null);
  const [form, setForm] = useState({
    kraId: employee.kras[0]?.id?.toString() ?? "",
    week: String(currentWeek),
    year: String(currentYear),
    progress: "50",
    score: "7",
    notes: "",
    blockers: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedKRA, setExpandedKRA] = useState<number | null>(null);

  function openAdd() {
    setEditReview(null);
    setForm({
      kraId: employee.kras[0]?.id?.toString() ?? "",
      week: String(currentWeek),
      year: String(currentYear),
      progress: "50",
      score: "7",
      notes: "",
      blockers: "",
    });
    setShowForm(true);
  }

  function openEdit(review: ReviewSerialized) {
    setEditReview(review);
    setForm({
      kraId: String(review.kraId),
      week: String(review.week),
      year: String(review.year),
      progress: String(review.progress),
      score: String(review.score),
      notes: review.notes,
      blockers: review.blockers,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (editReview) {
        await fetch(`/api/reviews/${editReview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progress: Number(form.progress),
            score: Number(form.score),
            notes: form.notes,
            blockers: form.blockers,
          }),
        });
      } else {
        await fetch(`/api/employees/${employee.id}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kraId: Number(form.kraId),
            week: Number(form.week),
            year: Number(form.year),
            progress: Number(form.progress),
            score: Number(form.score),
            notes: form.notes,
            blockers: form.blockers,
          }),
        });
      }
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reviewId: number) {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    router.refresh();
  }

  const allReviews = employee.kras
    .flatMap((k) => k.reviews.map((r) => ({ ...r, kraTitle: k.title })))
    .sort((a, b) => b.year - a.year || b.week - a.week);

  const scoreColor = (s: number) =>
    s >= 8 ? "text-green-600" : s >= 5 ? "text-yellow-600" : "text-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Weekly Reviews</h2>
        {employee.kras.length > 0 && (
          <button
            onClick={openAdd}
            className="text-sm bg-[#CC2229] text-white px-3 py-1.5 rounded-lg hover:bg-[#A81B21] transition"
          >
            + Add Review
          </button>
        )}
      </div>

      {/* Review Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editReview ? "Edit Review" : "Add Weekly Review"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
              )}
              {!editReview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KRA</label>
                  <select
                    required
                    value={form.kraId}
                    onChange={(e) => setForm({ ...form, kraId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  >
                    {employee.kras.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week #</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={53}
                    value={form.week}
                    onChange={(e) => setForm({ ...form, week: e.target.value })}
                    disabled={!!editReview}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229] disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    required
                    type="number"
                    min={2020}
                    max={2099}
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    disabled={!!editReview}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229] disabled:bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progress (%)
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress}
                    onChange={(e) => setForm({ ...form, progress: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score (1–10)
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={10}
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes / Achievements
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="What was accomplished this week?"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blockers (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any blockers or risks?"
                  value={form.blockers}
                  onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50"
                >
                  {loading ? "Saving…" : editReview ? "Update Review" : "Submit Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews grouped by KRA */}
      {employee.kras.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">Add KRAs first to start submitting reviews.</p>
        </div>
      ) : allReviews.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">No reviews yet. Click &quot;+ Add Review&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employee.kras
            .filter((k) => k.reviews.length > 0)
            .map((kra) => (
              <div key={kra.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedKRA(expandedKRA === kra.id ? null : kra.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{kra.title}</span>
                    <Badge label={`${kra.reviews.length} reviews`} variant="neutral" />
                  </div>
                  <span className="text-gray-400">{expandedKRA === kra.id ? "▲" : "▼"}</span>
                </button>

                {expandedKRA === kra.id && (
                  <div className="border-t divide-y">
                    {kra.reviews.map((review) => (
                      <div key={review.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700">
                              Week {review.week}, {review.year}
                            </span>
                            <Badge
                              label={`${review.progress}% progress`}
                              variant={
                                review.progress >= 80
                                  ? "success"
                                  : review.progress >= 50
                                  ? "warning"
                                  : "danger"
                              }
                            />
                            <span className={`text-sm font-bold ${scoreColor(review.score)}`}>
                              Score: {review.score}/10
                            </span>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => openEdit(review)}
                              className="text-xs border px-2 py-1 rounded text-gray-600 hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(review.id)}
                              className="text-xs border px-2 py-1 rounded text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{review.notes}</p>
                        {review.blockers && (
                          <p className="text-sm text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-2">
                            ⚠️ {review.blockers}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
