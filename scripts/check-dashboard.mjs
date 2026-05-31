import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
await mkdir("test-results", { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([{ name: "dev_employee_id", value: "4", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

// 1. Load dashboard
await page.goto("http://localhost:3000/dashboard");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: "test-results/dash-week.png" });
console.log("✅ Dashboard loaded (Week default)");

// 2. Click "Month" period in topbar
const monthBtn = page.getByRole("button", { name: "Month", exact: true });
if (await monthBtn.count() > 0) {
  await monthBtn.click();
  await page.waitForTimeout(1500);
  console.log("   URL after Month click:", page.url());
  await page.screenshot({ path: "test-results/dash-month.png" });
  console.log("✅ Month filter clicked");
} else {
  console.log("⚠ Month button not found");
}

// 3. Go back to dashboard, click a KPI tile (Active Pipeline)
await page.goto("http://localhost:3000/dashboard");
await page.waitForLoadState("networkidle");
const pipelineTile = page.getByText("Active Pipeline").first();
await pipelineTile.click();
await page.waitForTimeout(1200);
console.log("   URL after Active Pipeline KPI click:", page.url());
const navigated = page.url().includes("/pipeline/leads");
console.log(navigated ? "✅ KPI tile navigated to /pipeline/leads" : "⚠ KPI did not navigate");

// 4. Topbar search
await page.goto("http://localhost:3000/dashboard");
await page.waitForLoadState("networkidle");
const tbSearch = page.locator(".tb-search-input");
if (await tbSearch.count() > 0) {
  await tbSearch.fill("test");
  await tbSearch.press("Enter");
  await page.waitForTimeout(1200);
  console.log("   URL after topbar search:", page.url());
  console.log(page.url().includes("q=test") ? "✅ Topbar search navigated" : "⚠ Topbar search did not navigate");
}

await browser.close();
