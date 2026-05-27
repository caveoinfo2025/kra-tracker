import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import TasksClient from "./TasksClient";

export default async function TasksPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager = !!session.user.isManager;
  const empId     = session.user.employeeId;

  const tasks = await prisma.crmTask.findMany({
    where: isManager ? {} : { assignedToId: empId },
    include: {
      assignedTo:  { select: { id: true, name: true } },
      lead:        { select: { id: true, title: true, companyName: true } },
      opportunity: { select: { id: true, stage: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 300,
  });

  return (
    <SheetLayout
      title="Pipeline Tasks"
      description="View and manage all sales tasks across leads and opportunities."
    >
      <TasksClient
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        isManager={isManager}
      />
    </SheetLayout>
  );
}
