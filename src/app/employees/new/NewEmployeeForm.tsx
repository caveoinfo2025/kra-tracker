"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEmployeeForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", department: "", role: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create employee.");
        return;
      }
      router.push("/employees");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}
      {[
        { name: "name", label: "Full Name", type: "text", placeholder: "John Doe" },
        { name: "email", label: "Email", type: "email", placeholder: "john@caveoinfosystems.com" },
        { name: "department", label: "Department", type: "text", placeholder: "Sales" },
        { name: "role", label: "Role / Title", type: "text", placeholder: "Sales Executive" },
      ].map((f) => (
        <div key={f.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          <input
            type={f.type}
            required
            data-testid={`employee-${f.name}-input`}
            placeholder={f.placeholder}
            value={form[f.name as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
          />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          data-testid="employee-save-button"
          className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Employee"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          data-testid="employee-cancel-button"
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
