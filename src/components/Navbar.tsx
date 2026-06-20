import { signOut } from "@/../auth";
import { getSession } from "@/lib/dev-session";
import { cookies } from "next/headers";
import SidebarLinks from "./SidebarLinks";
import { isOperationsHead, isAccounts as isAccountsRole, isHeadOfSales } from "@/lib/roles";
import { getNavigationCapabilities } from "@/lib/access-control/navigation";
import { LogOut } from "lucide-react";
import prisma from "@/lib/prisma";

export default async function Navbar() {
  const session = await getSession();
  const user = session?.user;

  if (!user) return null;

  // Always read isManager AND role fresh from DB — the JWT may be stale (e.g.
  // role was just changed on the Team page but the user hasn't re-logged in).
  let isManager = user.isManager ?? false;
  let role = user.role ?? "";
  if (user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { isManager: true, role: true },
    });
    if (emp) { isManager = emp.isManager; role = emp.role; }
  }
  const liveUser = { isManager, role };

  // Accounts and Operations Head both use the finance-focused sidebar.
  const opsHead   = isOperationsHead(liveUser);
  const salesHead = isHeadOfSales(liveUser);
  const isOpsHead  = !isManager && opsHead;
  const isAccounts = !isManager && (isAccountsRole(liveUser) || opsHead);
  const showSettings = opsHead || salesHead || isManager;

  // Loaded once per request and passed straight to SidebarLinks — avoids a
  // DB round-trip per nav item (Step 2J).
  const nav = await getNavigationCapabilities(session);

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
    : isOpsHead
    ? "Operations Head"
    : role || "Employee";

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
        showSettings={showSettings}
        nav={nav}
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
