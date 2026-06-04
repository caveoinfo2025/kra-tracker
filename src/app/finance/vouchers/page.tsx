import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance } from "@/lib/roles";
import { FileText } from "lucide-react";

export default async function VouchersPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/dashboard");

  return (
    <SheetLayout
      title="Voucher Register"
      description="Formal numbered vouchers for all financial transactions."
      action={
        <button
          disabled
          className="btn-cav btn-cav-primary"
          style={{ opacity: 0.4, cursor: "not-allowed" }}
        >
          + New Voucher
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
        <FileText
          size={40}
          strokeWidth={1.2}
          style={{ color: "var(--fg-4)" }}
        />
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)" }}>
          Voucher Register
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--fg-3)",
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          Auto-numbered vouchers in the format{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-muted)",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            CI/26-27/00001
          </span>
          . Covers payment, receipt, expense, advance, and conveyance types.
          Printable PDF for each voucher.
        </div>
        <span
          className="badge badge-neutral"
          style={{ marginTop: 4, fontSize: 11 }}
        >
          Phase 4 — Coming soon
        </span>
      </div>
    </SheetLayout>
  );
}
