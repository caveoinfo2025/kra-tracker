import { redirect } from "next/navigation";

// Daily Updates has been retired (Enterprise KRA / Daily Activity decision, 2026-06-29) —
// Daily Activity (`/daily-activity`) replaces it for active entry/CRUD/productivity/reporting.
// The DailyUpdate Prisma model/table and its historical data are preserved untouched; this page
// is intentionally reduced to a redirect so the old CRUD UI is no longer reachable.
export default function DailyUpdatesPage() {
  redirect("/daily-activity");
}
