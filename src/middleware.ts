/**
 * Edge-runtime middleware — uses the lightweight authConfig (no Prisma).
 * Protects all routes except /login and /api/auth.
 */
import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
