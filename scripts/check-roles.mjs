import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
await mkdir("test-results", { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([{ name: "dev_employee_id", value: "4", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

await page.goto("http://localhost:3000/admin");
await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 8000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "test-results/admin-roles.png" });
console.log("✅ Roles tab (default)");

// Click BDE role
await page.getByText("Business Development Executive").click();
await page.waitForTimeout(500);
await page.screenshot({ path: "test-results/admin-roles-bde.png" });
console.log("✅ BDE role selected");

// Click Accounts role
await page.getByText("Accounts").first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: "test-results/admin-roles-accounts.png" });
console.log("✅ Accounts role selected");

await browser.close();
