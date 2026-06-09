import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { triggerEvent } from "@/lib/communication-engine";

/**
 * Internal trigger endpoint.
 * Protected: requires an authenticated manager session.
 * Use triggerEvent() directly in server-side code when possible.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Any authenticated user can trigger events (the engine resolves recipients internally)

  const body = await req.json();
  const { module, eventCode, data } = body;

  if (!module || !eventCode) {
    return NextResponse.json({ error: "module and eventCode required" }, { status: 400 });
  }

  const result = await triggerEvent({
    module,
    eventCode,
    data:        data ?? {},
    triggeredBy: session.user.employeeId ?? 0,
  });

  return NextResponse.json(result);
}
