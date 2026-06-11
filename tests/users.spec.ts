import { expect, test } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { deleteEmployee, listEmployees, uniqueValue } from './helpers/crm';
import { loginAsEmployee, loginAsManager } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('Employee administration', () => {
  let dbAvailable = false;
  let createdEmployeeId: number | null = null;
  const employeeName = uniqueValue('Playwright Employee');
  const employeeEmail = `${uniqueValue('employee').toLowerCase()}@example.com`;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
  });

  test.afterAll(async ({ request }) => {
    if (createdEmployeeId) {
      await deleteEmployee(request, createdEmployeeId);
    }
  });

  test('employee is redirected away from manager-only employee pages', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsEmployee(context, page, { redirectPath: '/employees' });

    await expect(page).toHaveURL(/\/employees\/\d+$/);

    await page.goto('/employees/new');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('manager can validate, create, edit, and delete an employee', async ({ page, context, request }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsManager(context, page, { redirectPath: '/employees/new' });

    const nameValidation = await page
      .getByTestId('employee-name-input')
      .evaluate((element) => (element as HTMLInputElement).validationMessage);
    expect(nameValidation).toBeTruthy();

    await page.getByTestId('employee-name-input').fill(employeeName);
    await page.getByTestId('employee-email-input').fill(employeeEmail);
    await page.getByTestId('employee-department-input').fill('Quality Assurance');
    await page.getByTestId('employee-role-input').fill('Playwright Tester');
    await page.getByTestId('employee-save-button').click();

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByText(employeeName)).toBeVisible();

    const employees = await listEmployees(request);
    const created = employees.find((employee) => employee.email === employeeEmail);

    expect(created).toBeDefined();
    createdEmployeeId = created!.id;

    await page.goto(`/employees/${createdEmployeeId}/edit`);
    await page.getByTestId('employee-role-input').fill('Senior Playwright Tester');
    await page.getByTestId('employee-save-button').click();

    await expect(page).toHaveURL(new RegExp(`/employees/${createdEmployeeId}$`));
    await expect(page.getByText('Senior Playwright Tester')).toBeVisible();

    await page.goto(`/employees/${createdEmployeeId}/edit`);
    await page.getByTestId('employee-delete-button').click();

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByText(employeeName)).toHaveCount(0);

    createdEmployeeId = null;
  });
});
