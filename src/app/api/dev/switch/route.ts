/** Only available in development. Sets/clears the dev impersonation cookie. */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { employeeId } = await req.json();
  const res = NextResponse.json({ ok: true });

  if (employeeId) {
    res.cookies.set("dev_employee_id", String(employeeId), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  } else {
    res.cookies.delete("dev_employee_id");
  }

  return res;
}
