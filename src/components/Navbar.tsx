"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
  ];

  return (
    <nav className="bg-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">🎯 KRA Tracker</span>
        </div>
        <div className="flex gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                pathname === l.href
                  ? "bg-white text-indigo-700"
                  : "hover:bg-indigo-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
