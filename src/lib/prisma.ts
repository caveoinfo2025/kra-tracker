import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";

// Resolve the SQLite file path from DATABASE_URL env var (strips "file:" prefix),
// or fall back to dev.db locations for local development.
function resolveDbPath(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // DATABASE_URL is "file:/absolute/path" or "file:./relative/path"
    return dbUrl.replace(/^file:/, "");
  }
  // Local dev fallback
  const candidates = [
    path.resolve(process.cwd(), "prisma", "dev.db"),
    path.resolve(process.cwd(), "dev.db"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // fall back to prisma/dev.db
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const dbPath = resolveDbPath();
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter } as never);
}

const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
