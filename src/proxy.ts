/**
 * Edge-runtime proxy (Next.js 16 replacement for middleware).
 * Uses the lightweight authConfig (no Prisma) to protect all routes
 * except /login and /api/auth.
 */
import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
