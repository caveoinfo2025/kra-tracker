import { BrowserContext, Page } from '@playwright/test';

export const EMP_ID  = 5;  // Mariarussell — regular employee
export const MGR_ID  = 4;  // Vijesh       — manager

/** Inject the dev session cookie so all requests are authenticated */
export async function loginAs(context: BrowserContext, employeeId: number) {
  await context.addCookies([{
    name: 'dev_employee_id',
    value: String(employeeId),
    domain: 'localhost',
    path: '/',
  }]);
}

/** Assert a page does NOT expose raw stack traces or Next.js error details */
export async function assertNoServerError(page: Page) {
  const body = await page.textContent('body') ?? '';
  const hasCrash = /Error:.*at .*\(.*:\d+:\d+\)/i.test(body)
    || body.includes('Internal Server Error')
    || body.includes('prisma.')
    || body.includes('PrismaClientKnownRequestError');
  if (hasCrash) throw new Error(`Page exposes server error details:\n${body.slice(0, 400)}`);
}
