/**
 * Integration Engine — Public API
 *
 * Provides read/write access to integration providers, connections,
 * credential references, and usage logs. All secret resolution happens
 * server-side only; no raw secrets are ever returned to callers.
 *
 * Usage:
 *   import { testConnection, logIntegrationAttempt } from "@/lib/integration-engine";
 */

export * from "./providers";
export * from "./connections";
export * from "./credentials";
export * from "./logs";
export * from "./test";
