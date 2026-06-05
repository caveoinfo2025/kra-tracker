/**
 * Workflow Engine — Approver Resolver
 *
 * Resolves who should approve a given workflow step based on approvalType:
 *   USER            → specific employee ID (already on step)
 *   ROLE            → all employees with the given role
 *   REPORTING_MANAGER → requestedBy's direct manager
 *   DEPARTMENT_HEAD → head of requestedBy's department
 *   POLICY_BASED    → evaluatePolicy() returns the approver
 */

export interface ResolvedApprover {
  userId:   number;
  userName: string;
  email?:   string;
}

export async function resolveApprovers(
  step:          { approvalType: string; approverId?: number | null; approverRoleId?: number | null },
  requestedById: number,
): Promise<ResolvedApprover[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    switch (step.approvalType) {
      case "USER": {
        if (!step.approverId) return [];
        const emp = await db.employee.findUnique({
          where:  { id: step.approverId },
          select: { id: true, name: true, email: true },
        }) as { id: number; name: string; email?: string } | null;
        return emp ? [{ userId: emp.id, userName: emp.name, email: emp.email }] : [];
      }

      case "ROLE": {
        if (!step.approverRoleId) return [];
        const emps = await db.employee.findMany({
          where:  { roleId: step.approverRoleId },
          select: { id: true, name: true, email: true },
        }) as Array<{ id: number; name: string; email?: string }>;
        return emps.map((e) => ({ userId: e.id, userName: e.name, email: e.email }));
      }

      case "REPORTING_MANAGER": {
        const emp = await db.employee.findUnique({
          where:   { id: requestedById },
          select:  { manager: { select: { id: true, name: true, email: true } } },
        }) as { manager: { id: number; name: string; email?: string } | null } | null;
        const mgr = emp?.manager;
        return mgr ? [{ userId: mgr.id, userName: mgr.name, email: mgr.email }] : [];
      }

      case "DEPARTMENT_HEAD": {
        const emp = await db.employee.findUnique({
          where:  { id: requestedById },
          select: { departmentId: true },
        }) as { departmentId?: number | null } | null;
        if (!emp?.departmentId) return [];

        const dept = await db.department.findUnique({
          where:  { id: emp.departmentId },
          select: { headId: true, head: { select: { id: true, name: true, email: true } } },
        }) as { head?: { id: number; name: string; email?: string } | null } | null;
        const head = dept?.head;
        return head ? [{ userId: head.id, userName: head.name, email: head.email }] : [];
      }

      case "POLICY_BASED": {
        const { evaluatePolicy } = await import("@/lib/policy-engine");
        const result = await evaluatePolicy({
          module: "WORKFLOW",
          event:  "RESOLVE_APPROVER",
          data:   { requestedById, stepApproverId: step.approverId },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assignedId = (result as any).assignedApproverId as number | undefined;
        if (!assignedId) return [];
        const emp = await db.employee.findUnique({
          where:  { id: assignedId },
          select: { id: true, name: true, email: true },
        }) as { id: number; name: string; email?: string } | null;
        return emp ? [{ userId: emp.id, userName: emp.name, email: emp.email }] : [];
      }

      default:
        return [];
    }
  } catch {
    return [];
  }
}
