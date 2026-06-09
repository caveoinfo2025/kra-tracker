import prisma from "@/lib/prisma";
import type { RecipientSpec } from "./rules";

export type ResolvedRecipient = {
  employeeId: number;
  name: string;
  email: string;
};

/**
 * Resolve a RecipientSpec to a list of concrete employee IDs.
 * All lookups are fail-open: if the DB query fails or returns nothing,
 * we return an empty array rather than throwing.
 */
export async function resolveRecipients(
  spec: RecipientSpec,
  data: Record<string, unknown>,
): Promise<ResolvedRecipient[]> {
  try {
    switch (spec.type) {
      case "USER": {
        const emp = await prisma.employee.findUnique({
          where: { id: Number(spec.value) },
          select: { id: true, name: true, email: true },
        });
        return emp ? [{ employeeId: emp.id, name: emp.name, email: emp.email }] : [];
      }

      case "ROLE": {
        const rows = await prisma.employee.findMany({
          where: { role: spec.value },
          select: { id: true, name: true, email: true },
        });
        return rows.map((r) => ({ employeeId: r.id, name: r.name, email: r.email }));
      }

      case "REPORTING_MANAGER": {
        const ownerId = data.ownerId ?? data.employeeId ?? data.requestorId;
        if (!ownerId) return [];
        const emp = await prisma.employee.findUnique({
          where: { id: Number(ownerId) },
          select: { reportsToId: true },
        });
        if (!emp?.reportsToId) return [];
        const mgr = await prisma.employee.findUnique({
          where: { id: emp.reportsToId },
          select: { id: true, name: true, email: true },
        });
        return mgr ? [{ employeeId: mgr.id, name: mgr.name, email: mgr.email }] : [];
      }

      case "RECORD_OWNER": {
        const ownerId = data.ownerId ?? data.employeeId ?? data.assignedToId;
        if (!ownerId) return [];
        const emp = await prisma.employee.findUnique({
          where: { id: Number(ownerId) },
          select: { id: true, name: true, email: true },
        });
        return emp ? [{ employeeId: emp.id, name: emp.name, email: emp.email }] : [];
      }

      case "REQUESTER": {
        const requestorId = data.requestorId ?? data.createdById;
        if (!requestorId) return [];
        const emp = await prisma.employee.findUnique({
          where: { id: Number(requestorId) },
          select: { id: true, name: true, email: true },
        });
        return emp ? [{ employeeId: emp.id, name: emp.name, email: emp.email }] : [];
      }

      case "DEPARTMENT_HEAD": {
        const rows = await prisma.employee.findMany({
          where: { department: spec.value, isManager: true },
          select: { id: true, name: true, email: true },
        });
        return rows.map((r) => ({ employeeId: r.id, name: r.name, email: r.email }));
      }

      case "TEAM": {
        const rows = await prisma.employee.findMany({
          where: { department: spec.value },
          select: { id: true, name: true, email: true },
        });
        return rows.map((r) => ({ employeeId: r.id, name: r.name, email: r.email }));
      }

      case "APPROVER": {
        const approverId = data.approverId;
        if (!approverId) return [];
        const emp = await prisma.employee.findUnique({
          where: { id: Number(approverId) },
          select: { id: true, name: true, email: true },
        });
        return emp ? [{ employeeId: emp.id, name: emp.name, email: emp.email }] : [];
      }

      default:
        return [];
    }
  } catch {
    return [];
  }
}
