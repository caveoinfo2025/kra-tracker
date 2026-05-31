import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SheetLayout from "@/components/SheetLayout";
import CustomerMasterClient from "./CustomerMasterClient";

export default async function CustomerMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

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
