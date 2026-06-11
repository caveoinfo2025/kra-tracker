import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function loadEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile('.env.test');
loadEnvFile('.env');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const basePort = new URL(baseURL).port || '3000';
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ||
  `node ./node_modules/next/dist/bin/next start -p ${basePort}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

const config = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  outputDir: 'test-results/artifacts',
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile (Pixel 5)',
      use: { ...devices['Pixel 5'] },
    },
  ],
});

if (!skipWebServer) {
  config.webServer = {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  };
}

export default config;
