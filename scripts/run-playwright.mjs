import {
  assertSafeTestDatabase,
  loadTestEnvironment,
  runCommand,
} from "./test-env-utils.mjs";

async function main() {
  try {
    const env = loadTestEnvironment();
    assertSafeTestDatabase(env);
    env.PLAYWRIGHT_BROWSERS_PATH = env.PLAYWRIGHT_BROWSERS_PATH || ".playwright-browsers";

    const args = ["playwright", "test", ...process.argv.slice(2)];
    const code = await runCommand("npx", args, env);
    process.exit(code);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

void main();
