import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditEmployeeForm from "./EditEmployeeForm";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: Number(id) },
  });
  if (!employee) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Employee</h1>
      <EditEmployeeForm employee={employee} />
    </div>
  );
}
