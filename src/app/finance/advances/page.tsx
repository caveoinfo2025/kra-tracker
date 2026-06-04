import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { Wallet } from "lucide-react";

export default async function AdvancesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // All authenticated employees can request and view their own advances

  return (
    <SheetLayout
      title="Employee Advances"
      description="Request and track cash advances before expenses are incurred."
      action={
        <button
          disabled
          className="btn-cav btn-cav-primary"
          style={{ opacity: 0.4, cursor: "not-allowed" }}
        >
          + Request Advance
        </button>
      }
    >
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
        <Wallet size={40} strokeWidth={1.2} style={{ color: "var(--fg-4)" }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)" }}>
          Employee Advances
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--fg-3)",
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          Request a cash advance with purpose and required date. Finance roles
          approve, disburse from a cash or bank account, and record settlement.
          Outstanding balance is tracked automatically.
        </div>
        <span
          className="badge badge-neutral"
          style={{ marginTop: 4, fontSize: 11 }}
        >
          Phase 6 — Coming soon
        </span>
      </div>
    </SheetLayout>
  );
}
