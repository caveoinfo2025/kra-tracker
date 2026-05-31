import { signOut } from "@/../auth";
import { getSession } from "@/lib/dev-session";
import { cookies } from "next/headers";
import SidebarLinks from "./SidebarLinks";
import { LogOut } from "lucide-react";
import prisma from "@/lib/prisma";

export default async function Navbar() {
  const session = await getSession();
  const user = session?.user;

  if (!user) return null;

  // Always read isManager fresh from DB — JWT may be stale or missing the field
  let isManager = user.isManager ?? false;
  if (user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { isManager: true },
    });
    if (emp) isManager = emp.isManager;
  }

  const isAccounts = !isManager && user.role === "Accounts";

  // Compute initials from name
  const displayName: string = (user.employeeName ?? user.name ?? "?") as string;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  const roleLabel = isManager
    ? "Manager"
    : isAccounts
    ? "Accounts"
    : (user.role as string | undefined) ?? "Employee";

  return (
    <aside className="sidebar">

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.png" alt="Caveo Infosystems" />
        <div>
          <div className="wm-row">
            <span className="red">CAVEO</span>
          </div>
          <div className="wm-sub">CRM · Sales Tracker</div>
        </div>
      </div>

      {/* ── Navigation (client — needs usePathname) ── */}
      <SidebarLinks
        isManager={isManager}
        isAccounts={isAccounts}
      />

      {/* ── Footer: user chip + sign out ── */}
      <div className="sidebar-footer">
        <div className="user-chip">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image as string}
              alt={displayName}
              className="uc-avatar"
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div className="uc-avatar">{initials}</div>
          )}
          <div className="uc-meta">
            <div className="uc-name">{displayName}</div>
            <div className="uc-role">{roleLabel}</div>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            // Clear the dev impersonation cookie so the dev bypass in
            // getSession() doesn't silently re-authenticate after sign-out.
            // In production this cookie never exists, so this is a no-op.
            (await cookies()).delete("dev_employee_id");
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="sidebar-signout">
            <LogOut size={13} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
