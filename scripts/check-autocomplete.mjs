import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";

await mkdir("test-results", { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([{ name: "dev_employee_id", value: "4", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

// ── Collections page ──
await page.goto("http://localhost:3000/collections");
await page.waitForLoadState("networkidle");

// Click the Add Invoice button
await page.getByRole("button", { name: /add invoice/i }).click();
await page.waitForTimeout(600);

// Find Customer Name input INSIDE the modal dialog (by its label)
const customerLabel = page.getByText("Customer Name *");
await customerLabel.waitFor({ timeout: 5000 });
// The input is the next sibling's child — use locator relative to the label
const modalInput = page.locator('[placeholder="Type customer name…"]');
await modalInput.waitFor({ timeout: 5000 });

// Type character by character to fire React onChange correctly
await modalInput.focus();
await page.keyboard.type("dr", { delay: 80 });
await page.waitForTimeout(1200); // debounce (200ms) + fetch + render

await page.screenshot({ path: "test-results/autocomplete-collections.png" });
console.log("✅  Collections screenshot saved");

// ── Sales Funnel page ──
await page.goto("http://localhost:3000/sales-funnel");
await page.waitForLoadState("networkidle");

await page.getByRole("button", { name: /add opportunity/i }).click();
await page.waitForTimeout(600);

const sfInput = page.locator('[placeholder="Type customer name…"]');
await sfInput.waitFor({ timeout: 5000 });
await sfInput.focus();
await page.keyboard.type("tech", { delay: 80 });
await page.waitForTimeout(1200);

await page.screenshot({ path: "test-results/autocomplete-salesfunnel.png" });
console.log("✅  Sales Funnel screenshot saved");

await browser.close();
