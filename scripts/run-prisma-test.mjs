import {
  assertSafeTestDatabase,
  loadTestEnvironment,
  runCommand,
} from "./test-env-utils.mjs";

async function main() {
  const subcommand = process.argv.slice(2);

  if (subcommand.length === 0) {
    console.error("Usage: node scripts/run-prisma-test.mjs <prisma args...>");
    process.exit(1);
  }

  try {
    const env = loadTestEnvironment();
    assertSafeTestDatabase(env);

    const code = await runCommand("npx", ["prisma", ...subcommand], env);
    process.exit(code);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

void main();
