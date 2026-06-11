import {
  assertSafeTestDatabase,
  loadTestEnvironment,
  runCommand,
} from "./test-env-utils.mjs";

async function main() {
  try {
    const env = loadTestEnvironment();
    assertSafeTestDatabase(env);

    const migrateCode = await runCommand(
      "npx",
      ["prisma", "migrate", "deploy"],
      env,
    );

    if (migrateCode !== 0) {
      process.exit(migrateCode);
    }

    const generateCode = await runCommand("npx", ["prisma", "generate"], env);

    if (generateCode !== 0) {
      process.exit(generateCode);
    }

    const buildCode = await runCommand("npx", ["next", "build"], env);
    process.exit(buildCode);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

void main();
