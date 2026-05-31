import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
await mkdir("test-results", { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([{ name: "dev_employee_id", value: "4", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

await page.goto("http://localhost:3000/admin");
// wait until we leave /login
await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 8000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "test-results/admin-pipeline.png" });
console.log("✅ Pipeline tab");

await page.getByText("KRA Weights").click();
await page.waitForTimeout(600);
await page.screenshot({ path: "test-results/admin-kra.png" });
console.log("✅ KRA Weights tab");

await page.getByText("KRA Targets").click();
await page.waitForTimeout(400);
await page.screenshot({ path: "test-results/admin-kra-targets.png" });
console.log("✅ KRA Targets tab");

await page.getByText("System").click();
await page.waitForTimeout(400);
await page.screenshot({ path: "test-results/admin-system.png" });
console.log("✅ System tab");

await browser.close();
