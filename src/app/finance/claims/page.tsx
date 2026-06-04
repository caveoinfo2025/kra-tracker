import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { Layers } from "lucide-react";

export default async function ClaimsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // All authenticated employees can view their own claims

  return (
    <SheetLayout
      title="Employee Claims"
      description="Bundle approved expenses into claims for batch reimbursement."
      action={
        <button
          disabled
          className="btn-cav btn-cav-primary"
          style={{ opacity: 0.4, cursor: "not-allowed" }}
        >
          + New Claim
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
        <Layers size={40} strokeWidth={1.2} style={{ color: "var(--fg-4)" }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)" }}>
          Employee Claims
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--fg-3)",
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          Select multiple approved expenses and bundle them into a single
          reimbursement claim. Finance roles process payment against the approved
          claim total.
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
