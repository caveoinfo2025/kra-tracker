import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance } from "@/lib/roles";
import { BarChart3 } from "lucide-react";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export default async function FinanceReportsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/dashboard");

  return (
    <SheetLayout
      title="Finance Reports"
      description="Finance KPIs, trend charts, and export controls across all modules."
      action={
        <button
          disabled
          className="btn-cav btn-cav-secondary"
          style={{ opacity: 0.4, cursor: "not-allowed" }}
        >
          Export All
        </button>
      }
    >
      <FinanceModuleStatusBanner
        variant="coming-soon"
        message="Finance Reports are under development. Cash flow, expense reports, customer profitability, and export reports will be enabled in upcoming phases."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          gap: 12,
          textAlign: "center",
        }}
      >
        <BarChart3
          size={40}
          strokeWidth={1.2}
          style={{ color: "var(--fg-4)" }}
        />
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)" }}>
          Finance Reports
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--fg-3)",
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          Widgets: cash &amp; bank balances, monthly collections vs expenses
          (grouped bar), expense by category (donut), conveyance by employee
          (bar), outstanding advances, and DSO trend. Excel / PDF / Tally XML
          export.
        </div>
        <span
          className="badge badge-neutral"
          style={{ marginTop: 4, fontSize: 11 }}
        >
          Phase 8 — Coming soon
        </span>
      </div>
    </SheetLayout>
  );
}
