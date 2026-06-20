import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SheetLayout from "@/components/SheetLayout";
import CustomerMasterClient from "./CustomerMasterClient";
import { importCustomersFromCrm } from "@/lib/customer-import";

// TODO (post-Step 2N): legacy /customers route is still session-only — no
// Masters/CustomerMaster/VIEW gate like /masters/customers now has. The
// underlying GET/POST /api/customers/master API is now guarded (Step 2N).
// Retirement/redirect of this page is the next step; tracked in
// docs/RBAC_MIGRATION_TRACKER.md — not changed here per scope.
export default async function CustomerMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Auto-seed the master table from CRM the first time it is opened on a fresh
  // database (e.g. production right after the migration). This makes existing
  // customers reflect immediately without needing a manual "Import from CRM".
  const existingCount = await prisma.customer.count();
  if (existingCount === 0) {
    await importCustomersFromCrm();
  }

  const customers = await prisma.customer.findMany({
    where: { parentId: null },
    include: { branches: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  const stats = {
    total:    await prisma.customer.count(),
    ho:       await prisma.customer.count({ where: { officeType: "HO", parentId: null } }),
    branches: await prisma.customer.count({ where: { officeType: "Branch" } }),
    withGst:  await prisma.customer.count({ where: { gstNo: { not: "" } } }),
  };

  return (
    <SheetLayout
      title="Customer Master"
      description="Central repository of all customers — import from CRM, add branches, remove duplicates."
    >
      <CustomerMasterClient
        initialCustomers={JSON.parse(JSON.stringify(customers))}
        stats={stats}
        isManager={!!session.user.isManager}
      />
    </SheetLayout>
  );
}
