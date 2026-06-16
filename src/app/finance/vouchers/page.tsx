import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isOperationsHead, isAccounts } from "@/lib/roles";
import VouchersClient from "./VouchersClient";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export interface VoucherCaps {
  roleLabel:   string;
  canManage:   boolean; // isOpsHd or isAccounts — sees all vouchers, can print/download
  canCancel:   boolean; // isOpsHd only — can void/cancel
  canExport:   boolean; // isOpsHd or isAccounts — Tally export
  currentUser: string;
  employeeId:  number;
}

export default async function VouchersPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/dashboard");

  const user    = session.user;
  const isOpsHd = isOperationsHead(user);
  const isAcc   = isAccounts(user);
  const isMgr   = !!user.isManager;

  const caps: VoucherCaps = {
    roleLabel:   isOpsHd ? "Accounts Admin" : isAcc ? "Accounts Team" : isMgr ? "Manager" : "Finance",
    canManage:   isOpsHd || isAcc,
    canCancel:   isOpsHd,
    canExport:   isOpsHd || isAcc,
    currentUser: user.employeeName ?? user.name ?? "You",
    employeeId:  user.employeeId   ?? 0,
  };

  return (
    <SheetLayout
      title="Voucher Register"
      description="Accounting vouchers for payment, receipt, journal, expense, advance and conveyance transactions."
    >
      <FinanceModuleStatusBanner
        variant="live-readonly"
        message="Voucher register reads live data. Voucher creation, PDF generation, cancellation, and Tally export are disabled until write APIs are implemented."
      />
      <VouchersClient caps={caps} />
    </SheetLayout>
  );
}
