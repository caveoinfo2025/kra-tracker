import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SheetLayout from "@/components/SheetLayout";
import CustomerMasterClient from "./CustomerMasterClient";
import { importCustomersFromCrm } from "@/lib/customer-import";
import { hasPermission } from "@/lib/access-control";

/**
 * Legacy operational Customer Master — live Prisma-backed list with real
 * Import-from-CRM, duplicate detection, and delete, all wired to
 * /api/customers/master*.
 *
 * Step 2O: NOT redirected to /masters/customers. That route is still a
 * UI-only mock-data phase (`MOCK_CUSTOMERS` in masters/customers/data.ts,
 * no fetch calls in its client component at all) — it has no real
 * persistence, no Import from CRM, no dedupe, and no delete. Redirecting
 * this page there would replace the only functional Customer Master with a
 * non-functional preview, a regression rather than a safe consolidation.
 * See docs/RBAC_MIGRATION_TRACKER.md Step 2O for the documented functional
 * gap and the recommended follow-up (wire /masters/customers to real data,
 * then retire this route).
 *
 * Guarded the same way /masters/customers is instead: real
 * Masters/CustomerMaster/VIEW permission check (access-control), OR'd with
 * isManager, redirecting to /dashboard on failure — closing the
 * "accessible to all authenticated users" gap for this entry point too.
 */
export default async function CustomerMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId    = session.user.employeeId!;
  const isManager = !!session.user.isManager;

  const canView = await hasPermission(userId, "Masters", "CustomerMaster", "VIEW");
  if (!canView && !isManager) redirect("/dashboard");

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
