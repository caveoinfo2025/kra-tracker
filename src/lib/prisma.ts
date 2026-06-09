import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Resolve MySQL/MariaDB connection settings.
//
// Prefer explicit DB_* env vars (no parsing, no encoding pitfalls). Otherwise
// fall back to parsing DATABASE_URL. NOTE: the Hostinger/Passenger runtime
// escapes characters such as `%` with a backslash when injecting env values
// (e.g. `Crm%40...` becomes `Crm\%40...`), which corrupts a URL-encoded
// password. We strip stray backslash-escapes before parsing so the password
// decodes correctly.
function resolveDbConfig(): DbConfig {
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER ?? "",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "",
    };
  }

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set (and no DB_HOST fallback)");
  }
  const url = new URL(raw.replace(/\\(.)/g, "$1"));
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

function createPrismaClient() {
  const cfg = resolveDbConfig();

  // Pool sizing notes
  // ─────────────────
  // Hostinger shared hosting caps remote MySQL connections per DB user at
  // ~10–15 total (all server processes combined).  Turbopack dev server can
  // hot-reload prisma.ts and briefly run two pool instances side-by-side, so
  // we keep the per-process limit small to stay safely under the ceiling.
  //
  // connectTimeout  – TCP + MySQL handshake to srv2201.hstgr.io.  The default
  //   is 10 000 ms which is exactly the "pool timeout" we hit when the cold
  //   pool races against the first page-load burst.  20 s gives the remote
  //   server breathing room under load without hanging the UI forever.
  //
  // acquireTimeout  – how long a caller waits in the pool queue before giving
  //   up.  30 s is generous for an admin page; keeps SSR alive during transient
  //   latency spikes.
  //
  // idleTimeout     – close connections that have been idle for 60 s.  Prevents
  //   stale-connection errors after the dev server sits dormant and Hostinger
  //   drops the server-side TCP socket.
  //
  // minimumIdle: 0  – don't eagerly open connections on startup.  The first
  //   real query opens them; subsequent queries reuse them.  This avoids the
  //   "all 5 connections time out simultaneously on cold start" problem.

  const isProd = process.env.NODE_ENV === "production";

  const adapter = new PrismaMariaDb({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    // Production gets a deeper pool; dev stays lean to respect shared-hosting limits
    connectionLimit: isProd ? 5 : 2,
    // Generous handshake timeout — remote Hostinger server can be sluggish
    connectTimeout: 20_000,
    // How long callers wait in the queue for a free connection
    acquireTimeout: 30_000,
    // Drop idle connections after 60 s to avoid stale-socket errors
    idleTimeout: 60_000,
    // Don't pre-open connections — open lazily on first query
    minimumIdle: 0,
  });
  return new PrismaClient({ adapter });
}

// ── Singleton ────────────────────────────────────────────────────────────────
// In production a single module instance lives for the process lifetime.
//
// In Turbopack dev, HMR can re-evaluate this module while the previous pool
// is still open.  We store the client on `globalThis` so the new evaluation
// reuses the existing pool instead of leaking a second one.  If the stored
// client's adapter was created with different config (rare) we fall through and
// create a new one — the old pool will eventually be GC'd.

const prisma: PrismaClient = (() => {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.prisma) {
      globalThis.prisma = createPrismaClient();
    }
    return globalThis.prisma;
  }
  return createPrismaClient();
})();

export default prisma;
