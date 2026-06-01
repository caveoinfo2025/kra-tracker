"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IndianRupee, ArrowRight } from "lucide-react";

type Payment = {
  id: number;
  amountLakhs: number;
  customerName: string;
  invoiceNo: string;
  mode: string;
  recordedBy: string;
  paymentDate: string;
};

type Summary = { totalLakhs: number; count: number; payments: Payment[] };

function fmt(lakhs: number) {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)}Cr`;
  return `₹${lakhs.toFixed(2)}L`;
}

/** Web dashboard card: today's payments received. */
export default function PaymentsTodayWidget() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments/today")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="ch-title">Payments Today</div>
          <div className="ch-sub">
            {loading ? "Loading…" : `${data?.count ?? 0} received · ${fmt(data?.totalLakhs ?? 0)}`}
          </div>
        </div>
        <Link href="/accounts" className="btn btn-ghost btn-sm" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
          Accounts <ArrowRight size={12} />
        </Link>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "16px 18px", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
        ) : !data || data.count === 0 ? (
          <div style={{ padding: "20px 18px", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
            No payments recorded today.
          </div>
        ) : (
          data.payments.slice(0, 6).map((p) => (
            <div key={p.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(31,157,85,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IndianRupee size={15} style={{ color: "var(--success)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>{p.customerName}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                  {p.invoiceNo ? `Inv ${p.invoiceNo} · ` : ""}{p.mode}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", flexShrink: 0 }}>
                {fmt(p.amountLakhs)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
