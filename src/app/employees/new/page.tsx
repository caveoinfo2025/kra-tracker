import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import NewEmployeeForm from "./NewEmployeeForm";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user?.isManager) redirect("/");
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Employee</h1>
      <NewEmployeeForm />
    </div>
  );
}
