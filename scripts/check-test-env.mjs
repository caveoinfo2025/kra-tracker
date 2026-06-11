import {
  assertSafeTestDatabase,
  loadTestEnvironment,
} from "./test-env-utils.mjs";

try {
  const env = loadTestEnvironment();
  const target = assertSafeTestDatabase(env);

  console.log(
    `Test environment looks safe: ${target.host || "unknown-host"}:${target.port}/${target.database} (${target.source})`,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
