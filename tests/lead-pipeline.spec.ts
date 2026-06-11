import { expect, test } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { deleteLead } from './helpers/crm';
import { loginAsEmployee, loginAsManager } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('Lead pipeline', () => {
  let dbAvailable = false;
  let createdLeadId: number | null = null;
  const leadTitle = `Playwright Lead ${Date.now()}`;
  const companyName = `Playwright Company ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
  });

  test.afterAll(async ({ request }) => {
    if (createdLeadId) {
      await deleteLead(request, createdLeadId, 'employee');
    }
  });

  test('unauthenticated lead access redirects to login', async ({ page }) => {
    await page.goto('/pipeline/leads');

    await expect(page).toHaveURL(/\/login/);
  });

  test('role-based lead filters differ for employee and manager', async ({ browser }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    const employeeContext = await browser.newContext();
    const employeePage = await employeeContext.newPage();
    await loginAsEmployee(employeeContext, employeePage, { redirectPath: '/pipeline/leads' });
    await expect(employeePage.getByTestId('lead-owner-filter')).toHaveCount(0);
    await employeeContext.close();

    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await loginAsManager(managerContext, managerPage, { redirectPath: '/pipeline/leads' });
    await expect(managerPage.getByTestId('lead-owner-filter')).toBeVisible();
    await managerContext.close();
  });

  test('employee can validate, create, and advance a lead into an opportunity', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsEmployee(context, page, { redirectPath: '/pipeline/leads' });

    await page.getByTestId('lead-new-button').click();

    const titleValidation = await page
      .getByTestId('lead-title-input')
      .evaluate((element) => (element as HTMLInputElement).validationMessage);
    expect(titleValidation).toBeTruthy();

    await page.getByTestId('lead-title-input').fill(leadTitle);
    await page.getByPlaceholder('Type customer name…').fill(companyName);
    await page.getByTestId('lead-contact-input').fill('Playwright Contact');
    await page.getByTestId('lead-email-input').fill(`lead-${Date.now()}@example.com`);
    await page.getByTestId('lead-create-button').click();

    await expect(page.getByText(leadTitle)).toBeVisible();

    await page.getByTestId('lead-search-input').fill(leadTitle);
    const detailLink = page.locator('a[href*="/pipeline/leads/"]').last();
    const href = await detailLink.getAttribute('href');
    expect(href).toBeTruthy();

    const match = href?.match(/\/pipeline\/leads\/(\d+)/);
    expect(match).toBeTruthy();
    createdLeadId = Number(match?.[1]);

    await detailLink.click();
    await expect(page).toHaveURL(new RegExp(`/pipeline/leads/${createdLeadId}$`));

    await page.getByTestId('lead-stage-qualified').click();
    await expect(page.getByText(/Qualified/i)).toBeVisible();

    await page.getByTestId('lead-stage-proposal_sent').click();
    await expect(page).toHaveURL(/\/pipeline\/opportunities\/\d+$/);
    await expect(page.getByTestId('opportunity-stage-select')).toBeVisible();
  });
});
