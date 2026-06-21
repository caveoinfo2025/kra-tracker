import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import SheetLayout from "@/components/SheetLayout";
import { hasPermission } from "@/lib/access-control";
import { importCustomersFromCrm } from "@/lib/customer-import";
import CustomerMasterClient from "@/app/customers/CustomerMasterClient";

/**
 * Global Customer Master — enterprise customer registry.
 *
 * Step 2N: page access requires Masters/CustomerMaster/VIEW (access-control),
 * OR'd with isManager — the same manager-bypass shape Step 2J's
 * getNavigationCapabilities() already gives the sidebar link for this page (manager
 * gets ALL_TRUE, everyone else needs the real grant; no separate isOpsHead bridge),
 * so the page guard and the sidebar link agree on who can reach this page.
 *
 * Step 2P: this route is now wired to REAL data. It reuses the same Prisma-backed
 * CustomerMasterClient that /customers uses (live customer list, search/filter,
 * create/edit, delete, Import from CRM, duplicate detection — all against the
 * already-guarded /api/customers/master* APIs). It is no longer the UI-only
 * mock-data preview; that preview (MOCK_CUSTOMERS, deriveCustomerCaps, the
 * 12-tab enterprise profile components) still lives in this folder for future
 * reference but is no longer imported here — see ./CustomerMasterClient.tsx and
 * ./data.ts header comments. Button-level capability gating (Import/Find
 * Duplicates/Delete restricted to managers; Add/Edit open to all viewers) is the
 * same isManager-based logic /customers already used in production — this step
 * reuses proven behavior rather than introducing new capability tiers.
 *
 * /customers remains in place and fully functional (Step 2O/2P) pending a later
 * redirect step once this route has been verified at parity — tracked in
 * docs/RBAC_MIGRATION_TRACKER.md.
 *
 * GLOBAL CRM MASTER — single source of truth referenced by CRM Sales, Opportunities,
 * Quotations, Orders, Projects, Implementation, Support, AMC, Asset Management,
 * Finance, Customer Profitability, Engineer Visits, Local Conveyance, and Billing.
 */
export default async function GlobalCustomerMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId    = session.user.employeeId!;
  const isManager = !!session.user.isManager;

  const canView = await hasPermission(userId, "Masters", "CustomerMaster", "VIEW");
  if (!canView && !isManager) redirect("/dashboard");

  // Auto-seed the master table from CRM the first time it is opened on a fresh
  // database — mirrors /customers/page.tsx so both entry points behave
  // identically against the same underlying Customer table.
  const existingCount = await prisma.customer.count({ where: { deletedAt: null } });
  if (existingCount === 0) {
    await importCustomersFromCrm();
  }

  const customers = await prisma.customer.findMany({
    where: { parentId: null, deletedAt: null },
    include: { branches: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  const stats = {
    total:    await prisma.customer.count({ where: { deletedAt: null } }),
    ho:       await prisma.customer.count({ where: { officeType: "HO", parentId: null, deletedAt: null } }),
    branches: await prisma.customer.count({ where: { officeType: "Branch", deletedAt: null } }),
    withGst:  await prisma.customer.count({ where: { gstNo: { not: "" }, deletedAt: null } }),
  };

  return (
    <SheetLayout
      title="Customer Master"
      description="Global customer registry — used across CRM Sales, Projects, Support, AMC, Assets, Finance, and Profitability. Import from CRM, add branches, remove duplicates."
    >
      <CustomerMasterClient
        initialCustomers={JSON.parse(JSON.stringify(customers))}
        stats={stats}
        isManager={isManager}
      />
    </SheetLayout>
  );
}
