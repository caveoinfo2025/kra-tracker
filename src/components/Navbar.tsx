import Link from "next/link";
import { signOut } from "@/../auth";
import { getSession } from "@/lib/dev-session";

const MANAGER_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/kras", label: "KRAs" },
  { href: "/lead-generation", label: "Leads" },
  { href: "/sales-funnel", label: "Funnel" },
  { href: "/collections", label: "Collections" },
  { href: "/daily-updates", label: "Daily Updates" },
  { href: "/import", label: "Import" },
];

const EMPLOYEE_LINKS = [
  { href: "/kras", label: "My KRAs" },
  { href: "/lead-generation", label: "Leads" },
  { href: "/sales-funnel", label: "Funnel" },
  { href: "/collections", label: "Collections" },
  { href: "/daily-updates", label: "Daily Updates" },
];

const ACCOUNTS_LINKS = [
  { href: "/accounts", label: "Payment Tracker" },
  { href: "/collections", label: "All Collections" },
];

export default async function Navbar() {
  const session = await getSession();
  const user = session?.user;
  const employeeDashboardHref = `/employees/${user?.employeeId ?? ""}`;
  const isAccounts = !user?.isManager && user?.role === "Accounts";
  const navLinks = user?.isManager
    ? MANAGER_LINKS
    : isAccounts
    ? ACCOUNTS_LINKS
    : [{ href: employeeDashboardHref, label: "Dashboard" }, ...EMPLOYEE_LINKS];

  return (
    <nav className="bg-[#1E1E1E] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">

        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link
            href={user?.isManager ? "/" : isAccounts ? "/accounts" : `/employees/${user?.employeeId ?? ""}`}
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/LOGO.png"
              alt="Caveo Infosystems"
              className="h-9 w-auto"
            />
          </Link>
        </div>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto flex-1 justify-center">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium px-3 py-1.5 rounded-md text-gray-300 hover:bg-[#CC2229] hover:text-white transition-colors whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* User info + sign out */}
        {user ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none text-white">
                {user.employeeName ?? user.name ?? "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {user.isManager ? "Manager" : user.role ?? "Employee"}
              </p>
            </div>
            {user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-8 h-8 rounded-full border-2 border-[#CC2229]" />
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-xs bg-[#CC2229] hover:bg-[#A81B21] px-3 py-1.5 rounded-md transition font-medium"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="text-sm bg-[#CC2229] hover:bg-[#A81B21] text-white font-medium px-3 py-1.5 rounded-md transition">
            Sign in
          </Link>
        )}
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto border-t border-white/10">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md text-gray-300 hover:bg-[#CC2229] hover:text-white whitespace-nowrap transition-colors mt-1"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
