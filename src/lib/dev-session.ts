/**
 * getSession() — drop-in replacement for auth().
 *
 * In production:   delegates straight to NextAuth's auth().
 * In development:  if the `dev_employee_id` cookie is set (by the DevBar),
 *                  returns a synthetic session for that employee so you can
 *                  preview any user's view without a second Microsoft account.
 */
import { auth } from "@/../auth";
import { cookies } from "next/headers";
import prisma from "./prisma";
import type { Session } from "next-auth";

export async function getSession(): Promise<Session | null> {
  if (process.env.NODE_ENV !== "development") return auth();

  const cookieStore = await cookies();
  const devId = cookieStore.get("dev_employee_id")?.value;

  if (!devId) return auth();

  const employee = await prisma.employee.findUnique({ where: { id: Number(devId) } });
  if (!employee) return auth();

  // Return a session shaped exactly like the real NextAuth session
  return {
    user: {
      id: String(employee.id),
      email: employee.email,
      name: employee.name,
      employeeId: employee.id,
      employeeName: employee.name,
      isManager: employee.isManager,
      role: employee.role,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  } as Session;
}
