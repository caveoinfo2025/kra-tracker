import type { BrowserContext, Page } from '@playwright/test';

export type TestUserRole = 'admin' | 'manager' | 'employee';

type RoleConfig = {
  role: TestUserRole;
  employeeIdEnv: string;
  emailEnv: string;
  passwordEnv: string;
  fallbackEmployeeId?: number;
};

type ResolvedCredentials = {
  role: TestUserRole;
  employeeId?: number;
  email?: string;
  password?: string;
};

type LoginOptions = {
  redirectPath?: string;
};

const ROLE_CONFIG: Record<TestUserRole, RoleConfig> = {
  admin: {
    role: 'admin',
    employeeIdEnv: 'PLAYWRIGHT_ADMIN_EMPLOYEE_ID',
    emailEnv: 'PLAYWRIGHT_ADMIN_EMAIL',
    passwordEnv: 'PLAYWRIGHT_ADMIN_PASSWORD',
  },
  manager: {
    role: 'manager',
    employeeIdEnv: 'PLAYWRIGHT_MANAGER_EMPLOYEE_ID',
    emailEnv: 'PLAYWRIGHT_MANAGER_EMAIL',
    passwordEnv: 'PLAYWRIGHT_MANAGER_PASSWORD',
    fallbackEmployeeId: 4,
  },
  employee: {
    role: 'employee',
    employeeIdEnv: 'PLAYWRIGHT_EMPLOYEE_EMPLOYEE_ID',
    emailEnv: 'PLAYWRIGHT_EMPLOYEE_EMAIL',
    passwordEnv: 'PLAYWRIGHT_EMPLOYEE_PASSWORD',
    fallbackEmployeeId: 5,
  },
};

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEV_COOKIE_NAME = 'dev_employee_id';

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL;
}

function getLoginMode(): 'dev-cookie' | 'credentials' {
  return process.env.PLAYWRIGHT_LOGIN_MODE === 'credentials' ? 'credentials' : 'dev-cookie';
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to your test env file before running Playwright. ` +
      `See .env.test.example for the expected variables.`
    );
  }
  return value;
}

function readEmployeeId(config: RoleConfig): string {
  const explicitValue = process.env[config.employeeIdEnv]?.trim();

  if (explicitValue) {
    return explicitValue;
  }

  if (config.fallbackEmployeeId) {
    return String(config.fallbackEmployeeId);
  }

  throw new Error(
    `Missing ${config.employeeIdEnv}. Add it to your test env file before running Playwright. ` +
    `See .env.test.example for the expected variables.`
  );
}

export function getRoleCredentials(role: TestUserRole): ResolvedCredentials {
  const config = ROLE_CONFIG[role];
  const mode = getLoginMode();

  if (mode === 'credentials') {
    return {
      role,
      email: requireEnv(config.emailEnv),
      password: requireEnv(config.passwordEnv),
    };
  }

  const rawEmployeeId = readEmployeeId(config);
  const employeeId = Number(rawEmployeeId);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw new Error(
      `${config.employeeIdEnv} must be a positive integer employee id. ` +
      `Received "${rawEmployeeId}".`
    );
  }

  return { role, employeeId };
}

async function loginWithDevCookie(
  context: BrowserContext,
  page: Page,
  role: TestUserRole,
  options?: LoginOptions,
): Promise<void> {
  const credentials = getRoleCredentials(role);
  const baseUrl = getBaseUrl();
  const redirectPath = options?.redirectPath || '/';
  const url = new URL(baseUrl);

  if (!credentials.employeeId) {
    throw new Error(`No employee id was resolved for role "${role}".`);
  }

  await context.addCookies([
    {
      name: DEV_COOKIE_NAME,
      value: String(credentials.employeeId),
      domain: url.hostname,
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto(`${baseUrl}${redirectPath}`);
}

async function loginWithCredentials(_page: Page, role: TestUserRole): Promise<void> {
  const config = ROLE_CONFIG[role];
  requireEnv(config.emailEnv);
  requireEnv(config.passwordEnv);

  throw new Error(
    'Credential-based login is not implemented for this app because authentication is handled by ' +
    'Microsoft OAuth, not a local username/password form. Set PLAYWRIGHT_LOGIN_MODE=dev-cookie and ' +
    `provide ${config.employeeIdEnv} for Playwright runs in development.`
  );
}

export async function loginAsRole(
  context: BrowserContext,
  page: Page,
  role: TestUserRole,
  options?: LoginOptions,
): Promise<void> {
  if (getLoginMode() === 'credentials') {
    await loginWithCredentials(page, role);
    return;
  }

  await loginWithDevCookie(context, page, role, options);
}

export async function loginAsAdmin(
  context: BrowserContext,
  page: Page,
  options?: LoginOptions,
): Promise<void> {
  await loginAsRole(context, page, 'admin', options);
}

export async function loginAsManager(
  context: BrowserContext,
  page: Page,
  options?: LoginOptions,
): Promise<void> {
  await loginAsRole(context, page, 'manager', options);
}

export async function loginAsEmployee(
  context: BrowserContext,
  page: Page,
  options?: LoginOptions,
): Promise<void> {
  await loginAsRole(context, page, 'employee', options);
}
