import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Topbar from "@/components/Topbar";
import DevBar from "@/components/DevBar";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export const metadata: Metadata = {
  title: "Sales Tracker",
  description: "Track Caveo Sales team KRAs, pipeline, collections and daily updates",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // DevBar: only in development
  let devProps: {
    employees: { id: number; name: string; isManager: boolean }[];
    currentDevId: number | null;
  } | null = null;

  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    const devId = cookieStore.get("dev_employee_id")?.value;
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, isManager: true },
      orderBy: { name: "asc" },
    });
    devProps = { employees, currentDevId: devId ? Number(devId) : null };
  }

  // ── Unauthenticated: full-screen layout (login page) ──
  if (!session?.user) {
    return (
      <html lang="en" className="h-full antialiased">
        <body className="h-full" style={{ background: "var(--bg)", color: "var(--fg-1)", fontFamily: "var(--font-sans)" }}>
          {children}
          {devProps && (
            <DevBar employees={devProps.employees} currentDevId={devProps.currentDevId} />
          )}
        </body>
      </html>
    );
  }

  // ── Authenticated: sidebar app-shell ──
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <div className="app-shell">
          {/* Sidebar */}
          <Navbar />

          {/* Main column: topbar + scrollable content */}
          <div className="main-col">
            <Topbar />
            <main className="main-content">
              <div className="page-body">
                {children}
              </div>
            </main>
          </div>
        </div>

        {devProps && (
          <DevBar employees={devProps.employees} currentDevId={devProps.currentDevId} />
        )}
      </body>
    </html>
  );
}
