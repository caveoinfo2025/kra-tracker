import { NextResponse } from "next/server";

// Daily Updates API retired (Enterprise KRA / Daily Activity decision, 2026-06-29) — Daily
// Activity (`/api/daily-activity/*`) replaces it. This route must no longer create/read
// DailyUpdate rows for active use; the DailyUpdate Prisma model/table and existing data are
// preserved untouched for historical purposes only. All methods return 410 Gone.
function retired() {
  return NextResponse.json(
    { error: "Daily Updates has been retired. Use Daily Activity instead.", redirectTo: "/daily-activity" },
    { status: 410 }
  );
}

export async function GET() {
  return retired();
}

export async function POST() {
  return retired();
}
