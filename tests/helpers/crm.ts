import { expect, type APIRequestContext } from '@playwright/test';
import { getRoleCredentials, type TestUserRole } from './login';

type LeadSeed = {
  title?: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  source?: string;
  expectedValue?: number;
};

type CreatedLead = {
  id: number;
  title: string;
  companyName: string;
  opportunityId?: number;
};

const DEV_COOKIE_NAME = 'dev_employee_id';

export function uniqueValue(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function authHeadersForRole(role: TestUserRole): Record<string, string> {
  const credentials = getRoleCredentials(role);

  if (!credentials.employeeId) {
    throw new Error(`Role "${role}" does not have a resolved employee id for dev-cookie login.`);
  }

  return {
    Cookie: `${DEV_COOKIE_NAME}=${credentials.employeeId}`,
  };
}

export async function listEmployees(request: APIRequestContext) {
  const response = await request.get('/api/employees', {
    headers: authHeadersForRole('manager'),
  });

  expect(response.ok()).toBeTruthy();

  return (await response.json()) as Array<{
    id: number;
    name: string;
    email: string;
    department: string;
    role: string;
  }>;
}

export async function createLeadViaApi(
  request: APIRequestContext,
  role: TestUserRole,
  seed: LeadSeed = {},
): Promise<CreatedLead> {
  const title = seed.title ?? uniqueValue('Playwright Lead');
  const companyName = seed.companyName ?? uniqueValue('Playwright Company');
  const contactPerson = seed.contactPerson ?? 'Playwright Contact';
  const email = seed.email ?? `${uniqueValue('lead').toLowerCase()}@example.com`;

  const response = await request.post('/api/pipeline/leads', {
    headers: {
      'Content-Type': 'application/json',
      ...authHeadersForRole(role),
    },
    data: {
      title,
      companyName,
      contactPerson,
      email,
      phone: seed.phone ?? '9999999999',
      source: seed.source ?? 'Website',
      expectedValue: seed.expectedValue ?? 12,
    },
  });

  expect(response.ok()).toBeTruthy();

  const lead = await response.json();

  return {
    id: lead.id as number,
    title,
    companyName,
    opportunityId: lead.opportunity?.id as number | undefined,
  };
}

export async function updateLeadStage(
  request: APIRequestContext,
  role: TestUserRole,
  leadId: number,
  stage: string,
) {
  const response = await request.patch(`/api/pipeline/leads/${leadId}/stage`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeadersForRole(role),
    },
    data: { stage },
  });

  expect(response.ok()).toBeTruthy();

  return response.json();
}

export async function createOpportunityFixture(
  request: APIRequestContext,
  role: TestUserRole,
): Promise<{ leadId: number; opportunityId: number }> {
  const lead = await createLeadViaApi(request, role);
  await updateLeadStage(request, role, lead.id, 'QUALIFIED');
  const updated = await updateLeadStage(request, role, lead.id, 'PROPOSAL_SENT');

  return {
    leadId: lead.id,
    opportunityId: updated.opportunity.id as number,
  };
}

export async function deleteLead(request: APIRequestContext, leadId: number, role: TestUserRole) {
  const response = await request.delete(`/api/pipeline/leads/${leadId}`, {
    headers: authHeadersForRole(role),
  });

  expect(response.ok()).toBeTruthy();
}

export async function deleteEmployee(request: APIRequestContext, employeeId: number) {
  const response = await request.delete(`/api/employees/${employeeId}`, {
    headers: authHeadersForRole('manager'),
  });

  expect(response.ok()).toBeTruthy();
}
