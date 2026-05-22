"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
};

export default function EditEmployeeForm({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    department: employee.department,
    role: employee.role,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update employee.");
        return;
      }
      router.push(`/employees/${employee.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${employee.name}? This will remove all their KRAs and reviews.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/employees/${employee.id}`, { method: "DELETE" });
      router.push("/employees");
      router.refresh();
    } catch {
      setError("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}
      {[
        { name: "name", label: "Full Name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "department", label: "Department", type: "text" },
        { name: "role", label: "Role / Title", type: "text" },
      ].map((f) => (
        <div key={f.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          <input
            type={f.type}
            required
            value={form[f.name as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full border border-red-300 text-red-600 text-sm font-medium py-2 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete Employee"}
        </button>
      </div>
    </form>
  );
}
