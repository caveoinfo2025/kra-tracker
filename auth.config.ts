/**
 * Edge-safe NextAuth config (no Prisma, no Node.js-only modules).
 * Used by src/middleware.ts which runs in the Edge runtime.
 * Full auth with DB callbacks lives in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const authConfig = {
  // Required when running behind Hostinger's reverse proxy (SSL terminator).
  // Trusts X-Forwarded-Host / X-Forwarded-Proto so NextAuth builds the correct
  // callback URL and sets cookies against the right domain.
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      // Support both local-dev names (AZURE_AD_*) and Hostinger/NextAuth-v5 names (AUTH_MICROSOFT_ENTRA_ID_*)
      clientId:
        process.env.AZURE_AD_CLIENT_ID ??
        process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret:
        process.env.AZURE_AD_CLIENT_SECRET ??
        process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      ...((process.env.AZURE_AD_TENANT_ID ??
        process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID) && {
        issuer: `https://login.microsoftonline.com/${
          process.env.AZURE_AD_TENANT_ID ??
          process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
        }/v2.0`,
      }),
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isPublic =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/api/auth");
      if (isPublic) return true;

      // Development-only bypass: if dev_employee_id cookie is set with a
      // non-empty numeric value, let the request through.
      // getSession() in each server component resolves the synthetic session.
      // NOTE: process.env.NODE_ENV is "production" on Hostinger, so this
      //       code path is completely dead in production builds.
      if (process.env.NODE_ENV === "development") {
        const devId = request.cookies.get("dev_employee_id")?.value;
        if (devId && /^\d+$/.test(devId)) return true;
      }

      // Authenticated — allow through
      if (auth) return true;

      // API routes: return 401 JSON instead of redirecting to /login.
      // This lets REST clients (mobile app, integrations) receive a proper
      // machine-readable response rather than an HTML redirect.
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Page routes: redirect to /login
      return false;
    },
  },
} satisfies NextAuthConfig;
