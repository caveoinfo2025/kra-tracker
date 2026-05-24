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
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      ...(process.env.AZURE_AD_TENANT_ID && {
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
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
      return !!auth;
    },
  },
} satisfies NextAuthConfig;
