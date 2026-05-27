import { signOut } from "@/../auth";
import { getSession } from "@/lib/dev-session";
import SidebarLinks from "./SidebarLinks";
import { LogOut } from "lucide-react";

export default async function Navbar() {
  const session = await getSession();
  const user = session?.user;

  if (!user) return null;

  const isAccounts = !user.isManager && user.role === "Accounts";

  // Compute initials from name
  const displayName: string = (user.employeeName ?? user.name ?? "?") as string;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  const roleLabel = user.isManager
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
        isManager={user.isManager ?? false}
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
