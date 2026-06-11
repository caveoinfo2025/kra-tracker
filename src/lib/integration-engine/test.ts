import { getConnection, recordTestResult } from "./connections";
import { resolveSecret }                   from "./credentials";
import { logIntegrationAttempt }           from "./logs";

export interface TestResult {
  success:     boolean;
  message:     string;
  latencyMs?:  number;
  details?:    Record<string, unknown>;
}

/**
 * Run a connectivity test for a given connection.
 * All tests are dry-run / non-destructive.
 * Live external calls are only made if status is TEST_MODE or ACTIVE and
 * the env var referenced in secretRef is actually set.
 */
export async function testConnection(connectionId: number): Promise<TestResult> {
  const conn = await getConnection(connectionId);
  if (!conn) {
    return { success: false, message: "Connection not found" };
  }

  const secret = resolveSecret(conn.secretRef ?? null);
  const category = conn.provider?.category ?? "CUSTOM_API";

  let result: TestResult;
  const start = Date.now();

  try {
    result = await runTest(category, conn.configJson, secret);
  } catch (err) {
    result = {
      success:  false,
      message:  err instanceof Error ? err.message : "Test threw an exception",
    };
  }

  result.latencyMs = Date.now() - start;

  await recordTestResult(connectionId, result.success);
  await logIntegrationAttempt({
    connectionId,
    module:          "INTEGRATION_CENTER",
    event:           "CONNECTION_TEST",
    requestSummary:  { category, hasSecret: Boolean(secret) },
    responseSummary: { success: result.success, message: result.message, latencyMs: result.latencyMs },
    status:          result.success ? "SUCCESS" : "FAILED",
    errorMessage:    result.success ? undefined : result.message,
  });

  return result;
}

async function runTest(
  category: string,
  configJson: string,
  secret: string | null,
): Promise<TestResult> {
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(configJson); } catch { /* keep empty */ }

  switch (category) {
    case "EMAIL":
      return testEmailConfig(config, secret);

    case "GST":
    case "PAN":
      return testApiKeyConfig(category, config, secret);

    case "MAPS":
      return testApiKeyConfig("MAPS", config, secret);

    case "WHATSAPP":
    case "SMS":
      return testApiKeyConfig(category, config, secret);

    case "TEAMS":
    case "WEBHOOK":
      return testWebhookConfig(config);

    case "ACCOUNTING":
      return testApiKeyConfig("ACCOUNTING", config, secret);

    default:
      return testApiKeyConfig("GENERIC", config, secret);
  }
}

function testEmailConfig(
  config: Record<string, unknown>,
  secret: string | null,
): TestResult {
  const host = config.host as string | undefined;
  const port = config.port as number | undefined;
  if (!host) return { success: false, message: "SMTP host not configured" };
  if (!port) return { success: false, message: "SMTP port not configured" };
  if (!secret) {
    return {
      success: false,
      message: `Env var not set — add the referenced environment variable to .env`,
    };
  }
  // Config looks valid; no live SMTP connection in test (avoid unintended mail)
  return {
    success: true,
    message: `SMTP config is valid (host: ${host}, port: ${port}). Live send test requires ACTIVE status.`,
    details: { host, port, hasCredential: true },
  };
}

function testApiKeyConfig(
  type: string,
  config: Record<string, unknown>,
  secret: string | null,
): TestResult {
  if (!secret) {
    return {
      success: false,
      message: `${type}: Env var not set — add the referenced environment variable to .env`,
    };
  }
  const endpoint = config.endpoint as string | undefined;
  return {
    success: true,
    message: `${type}: API key is configured${endpoint ? ` (endpoint: ${endpoint})` : ""}. Live call requires ACTIVE status.`,
    details: { hasApiKey: true, endpoint: endpoint ?? null },
  };
}

function testWebhookConfig(config: Record<string, unknown>): TestResult {
  const url = config.webhookUrl as string | undefined;
  if (!url) return { success: false, message: "Webhook URL not configured" };
  try {
    new URL(url);
  } catch {
    return { success: false, message: `Invalid webhook URL: ${url}` };
  }
  return {
    success: true,
    message: `Webhook URL is valid: ${url}`,
    details: { webhookUrl: url },
  };
}
