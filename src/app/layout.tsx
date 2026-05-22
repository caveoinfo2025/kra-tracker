import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DevBar from "@/components/DevBar";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales Tracker",
  description: "Track Caveo Sales team KRAs, pipeline, collections and daily updates",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // DevBar: only in development — fetch employees and current dev cookie
  let devProps: { employees: { id: number; name: string; isManager: boolean }[]; currentDevId: number | null } | null = null;
  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    const devId = cookieStore.get("dev_employee_id")?.value;
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, isManager: true },
      orderBy: { name: "asc" },
    });
    devProps = { employees, currentDevId: devId ? Number(devId) : null };
  }

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        {devProps && <DevBar employees={devProps.employees} currentDevId={devProps.currentDevId} />}
      </body>
    </html>
  );
}
