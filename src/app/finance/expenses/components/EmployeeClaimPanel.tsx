"use client";
import { Wallet } from "lucide-react";
import { EMPLOYEE_ADVANCES, fmtINR } from "../data";

/**
 * EmployeeClaimPanel — advance balance preview for an employee claim.
 * Advance Given − Claim Amount = Balance.
 */
export default function EmployeeClaimPanel({
  employee, claimAmount, adjust,
}: {
  employee: string;
  claimAmount: number;
  adjust: number; // advance adjustment applied
}) {
  if (!employee) return null;
  const advance = EMPLOYEE_ADVANCES[employee] ?? 0;
  const balance = advance - adjust;

  const Row = ({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{k}</span>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 600, color: tone ?? "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", background: "var(--surface-alt)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Wallet size={15} style={{ color: "var(--caveo-red)" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Advance Balance — {employee}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Row k="Advance Given" v={fmtINR(advance)} />
        <Row k="Claim Amount" v={fmtINR(claimAmount)} />
        {adjust > 0 && <Row k="Adjusted Against Advance" v={`− ${fmtINR(adjust)}`} tone="var(--caveo-red)" />}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
          <Row k="Remaining Advance" v={fmtINR(Math.max(0, balance))} strong />
        </div>
      </div>
    </div>
  );
}
