import type { APIRequestContext } from '@playwright/test';
import { authHeadersForRole } from './crm';

export async function isDatabaseAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get('/api/employees', {
      headers: authHeadersForRole('manager'),
    });

    return response.ok();
  } catch {
    return false;
  }
}
