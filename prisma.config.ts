// DATABASE_URL is injected by Hostinger at runtime; no dotenv needed in production.
// For local dev, Next.js loads .env files automatically before any server code runs.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
