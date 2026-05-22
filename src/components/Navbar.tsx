import Link from "next/link";
import { signOut } from "@/../auth";
import { getSession } from "@/lib/dev-session";

const MANAGER_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/lead-generation", label: "Leads" },
  { href: "/sales-funnel", label: "Funnel" },
  { href: "/collections", label: "Collections" },
  { href: "/daily-updates", label: "Daily Updates" },
];

const EMPLOYEE_LINKS = [
  { href: "/lead-generation", label: "Leads" },
  { href: "/sales-funnel", label: "Funnel" },
  { href: "/collections", label: "Collections" },
  { href: "/daily-updates", label: "Daily Updates" },
];

export default async function Navbar() {
  const session = await getSession();
  const user = session?.user;
  const navLinks = user?.isManager ? MANAGER_LINKS : EMPLOYEE_LINKS;

  return (
    <nav className="bg-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
        {/* Logo â€” links manager to dashboard, employee to their own profile */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={user?.isManager ? "/" : `/employees/${user?.employeeId ?? ""}`}
            className="text-xl font-bold tracking-tight hover:opacity-90"
          >
            ðŸ“Š Sales Tracker
          </Link>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-indigo-600 transition-colors whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* User info + sign out */}
        {user ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">
                {user.employeeName ?? user.name ?? "â€”"}
              </p>
              <p className="text-xs text-indigo-200 mt-0.5">
                {user.isManager ? "Manager" : user.role ?? "Employee"}
              </p>
            </div>
            {user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-8 h-8 rounded-full border-2 border-indigo-300" />
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-xs bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-md transition"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="text-sm bg-white text-indigo-700 font-medium px-3 py-1.5 rounded-md hover:bg-indigo-50 transition">
            Sign in
          </Link>
        )}
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs font-medium px-2.5 py-1 rounded-md hover:bg-indigo-600 whitespace-nowrap transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

