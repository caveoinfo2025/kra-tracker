"use client";

import {
  MapPin, CheckCircle2, Clock, Wallet, IndianRupee, Users, BarChart3, CreditCard,
} from "lucide-react";
import ExpenseSummaryCard from "../../expenses/components/ExpenseSummaryCard";
import { TravelTrip, MonthlyStatement, ConveyanceCaps, fmtKM } from "../data";

interface Props {
  trips: TravelTrip[];
  monthly: MonthlyStatement[];
  caps: ConveyanceCaps;
  currentEmployee: string;
}

export default function ConveyanceSummaryCards({ trips, monthly, caps, currentEmployee }: Props) {
  // ── Employee view ──
  if (caps.scope === "own") {
    const mine = trips.filter((t) => t.employee === currentEmployee && t.month === "June 2026");
    const totalKm    = mine.reduce((s, t) => s + t.payableKm, 0);
    const approvedKm = mine.filter((t) => ["Approved","Verified","Paid"].includes(t.status)).reduce((s, t) => s + t.payableKm, 0);
    const pendingKm  = mine.filter((t) => t.status === "Submitted").reduce((s, t) => s + t.payableKm, 0);
    const estAmt     = mine.reduce((s, t) => s + t.claimAmount, 0);
    const paidAmt    = mine.filter((t) => t.status === "Paid").reduce((s, t) => s + t.claimAmount, 0);
    return (
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Current Month KM"  value={fmtKM(totalKm)}    money={false} icon={MapPin}       accent />
        <ExpenseSummaryCard label="Approved KM"        value={fmtKM(approvedKm)} money={false} icon={CheckCircle2} tone="credit" />
        <ExpenseSummaryCard label="Pending KM"         value={fmtKM(pendingKm)}  money={false} icon={Clock}        tone="warn" />
        <ExpenseSummaryCard label="Estimated Amount"   value={estAmt}                           icon={IndianRupee} />
        <ExpenseSummaryCard label="Paid Amount"        value={paidAmt}                          icon={Wallet}       tone="credit" />
      </div>
    );
  }

  // ── Manager view ──
  if (caps.scope === "team") {
    const pending    = trips.filter((t) => t.status === "Submitted");
    const teamKm     = trips.filter((t) => t.month === "June 2026").reduce((s, t) => s + t.payableKm, 0);
    const monthClaim = trips.filter((t) => t.month === "June 2026").reduce((s, t) => s + t.claimAmount, 0);
    return (
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Pending Approvals"   value={pending.length}         money={false} icon={Clock}     tone="warn"   accent />
        <ExpenseSummaryCard label="Team Travel (Month)" value={fmtKM(teamKm)}          money={false} icon={Users} />
        <ExpenseSummaryCard label="Monthly Claim"       value={monthClaim}                            icon={IndianRupee} />
      </div>
    );
  }

  // ── Accounts / OpsHead view ──
  const stmt    = monthly.filter((m) => m.month === "June 2026");
  const total   = stmt.reduce((s, m) => s + m.claimAmount, 0);
  const approved= stmt.reduce((s, m) => s + m.approvedAmount, 0);
  const payPend = stmt.filter((m) => m.status === "Payment Pending").reduce((s, m) => s + (m.approvedAmount - m.paidAmount), 0);
  const paid    = stmt.reduce((s, m) => s + m.paidAmount, 0);
  return (
    <div className="kpi-grid">
      <ExpenseSummaryCard label="Total Monthly Claims"  value={total}    icon={BarChart3}   accent />
      <ExpenseSummaryCard label="Approved Amount"       value={approved} icon={CheckCircle2} tone="credit" />
      <ExpenseSummaryCard label="Payment Pending"       value={payPend}  icon={Clock}        tone="warn" />
      <ExpenseSummaryCard label="Paid Amount"           value={paid}     icon={CreditCard}   tone="credit" />
    </div>
  );
}
