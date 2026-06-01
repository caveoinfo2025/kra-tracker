import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "1") {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Maintenance in progress. Please try again shortly." },
        { status: 503 }
      );
    }
    return NextResponse.rewrite(new URL("/maintenance.html", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maintenance.html).*)"],
};
