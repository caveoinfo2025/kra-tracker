import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function loadEnvFile(fileName, env = process.env) {
  const filePath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return true;
}

export function loadTestEnvironment(env = process.env) {
  const loadedTestEnv = loadEnvFile(".env.test", env);

  if (!loadedTestEnv) {
    throw new Error(
      "Missing .env.test. Copy .env.test.example to .env.test and fill in the dedicated test database credentials before running test workflows.",
    );
  }

  loadEnvFile(".env", env);

  env.NODE_ENV = "test";
  env.PLAYWRIGHT = env.PLAYWRIGHT || "1";

  return env;
}

export function resolveDbTarget(env = process.env) {
  if (env.DB_HOST || env.DB_NAME) {
    return {
      source: "DB_*",
      host: env.DB_HOST || "",
      port: env.DB_PORT || "3306",
      database: env.DB_NAME || "",
    };
  }

  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set in .env.test, and DB_HOST/DB_NAME were not provided either.",
    );
  }

  let parsed;

  try {
    parsed = new URL(env.DATABASE_URL.replace(/\\(.)/g, "$1"));
  } catch (error) {
    throw new Error(`DATABASE_URL in .env.test is invalid: ${error.message}`);
  }

  return {
    source: "DATABASE_URL",
    host: parsed.hostname,
    port: parsed.port || "3306",
    database: parsed.pathname.replace(/^\//, ""),
  };
}

export function assertSafeTestDatabase(env = process.env) {
  const target = resolveDbTarget(env);
  const dbName = target.database.trim();
  const host = target.host.trim();
  const label = `${host || "unknown-host"}:${target.port}/${dbName || "unknown-db"}`;

  if (!dbName) {
    throw new Error(`Test database name is empty (${label}).`);
  }

  if (/(prod|production|staging|live|main|primary|caveodev)/i.test(dbName)) {
    throw new Error(
      `Refusing to run against suspicious database "${dbName}". Use a dedicated database whose name clearly includes "test", "e2e", or "playwright".`,
    );
  }

  if (!/(test|e2e|playwright)/i.test(dbName)) {
    throw new Error(
      `Refusing to run against "${dbName}" because it does not look like an isolated test database. Rename it or point .env.test at a database with "test", "e2e", or "playwright" in the name.`,
    );
  }

  const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(host);
  const confirmedRemote = env.TEST_DATABASE_CONFIRMED === "1";

  if (!isLocalHost && !confirmedRemote) {
    throw new Error(
      `Test database host "${host}" is not local. Set TEST_DATABASE_CONFIRMED=1 in .env.test only after verifying that ${label} is a separate non-production test database.`,
    );
  }

  return target;
}

export function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code || 0));
  });
}
