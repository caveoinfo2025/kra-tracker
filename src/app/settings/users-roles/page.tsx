import { redirect } from "next/navigation";

// Superseded by /settings/identity (Phase 4 — Identity & Access Management).
export default function UsersRolesPage() {
  redirect("/settings/identity");
}
