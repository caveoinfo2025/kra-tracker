/**
 * Full NextAuth config — runs in Node.js only (API routes, server components).
 * Extends authConfig with Prisma-backed JWT callbacks.
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    // 8-hour sessions — matches a standard work day.
    // After this, the JWT is considered expired and the user is redirected
    // to re-authenticate via Microsoft Entra ID.
    maxAge: 8 * 60 * 60, // 28 800 seconds
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, resolve the employee record from the DB
      if (account && profile?.email) {
        const msEmail = profile.email as string;
        const msId = (profile as { sub?: string }).sub as string | undefined;

        let employee = await prisma.employee.findFirst({
          where: {
            OR: [{ msEmail }, { email: msEmail }],
          },
        });

        if (employee) {
          // Auto-persist msEmail + msId so future logins don't need OR lookup
          if (!employee.msEmail && msEmail) {
            employee = await prisma.employee.update({
              where: { id: employee.id },
              data: { msEmail, ...(msId ? { msId } : {}) },
            });
          }
          token.employeeId = employee.id;
          token.employeeName = employee.name;
          token.isManager = employee.isManager;
          token.role = employee.role;
        }
        token.msEmail = msEmail;
        if (msId) token.msId = msId;
      }

      // Re-hydrate isManager AND role from the DB on every token refresh, so
      // changes made on the Team page (e.g. assigning the Operations Head role)
      // take effect without forcing the user to sign out and back in.
      if (token.employeeId) {
        const emp = await prisma.employee.findUnique({
          where: { id: token.employeeId as number },
          select: { isManager: true, role: true },
        });
        if (emp) {
          token.isManager = emp.isManager;
          token.role = emp.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.employeeId = token.employeeId as number | undefined;
      session.user.employeeName = token.employeeName as string | undefined;
      session.user.isManager = token.isManager as boolean | undefined;
      session.user.role = token.role as string | undefined;
      session.user.msEmail = token.msEmail as string | undefined;
      return session;
    },
    // Keep the Edge-compatible `authorized` callback from authConfig
    ...authConfig.callbacks,
  },
});
