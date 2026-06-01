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
  const adapter = new PrismaMariaDb({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}

const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
