import { test, type Page } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

// Not an assertion test: it drives the app at both widths and saves images
// so the UI can actually be looked at, per AGENTS.md.

const CODE = "424242";
const run = Date.now();
const PASSWORD = `Sc0ut!${run}`;
const TOPIC = "mechanistic interpretability";

test.beforeAll(async () => { await clerkSetup(); });

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.locator('input[name="emailAddress"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText(/verify|verification|check your email/i).first().waitFor({ timeout: 30_000 });
  await page.keyboard.type(CODE, { delay: 60 });
  await page.waitForURL("/", { timeout: 60_000 });
}

for (const [label, width, height] of [["390", 390, 844], ["1440", 1440, 900]] as const) {
  test(`screens at ${label}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    try {
      await signUp(page, `shot.${label}+clerk_test.${run}@example.com`);

      await page.screenshot({ path: `e2e/shots/${label}-empty-search.png`, fullPage: true });

      await page.getByLabel(/research topic/i).fill(TOPIC);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.locator("li").first().waitFor({ timeout: 40_000 });
      await page.screenshot({ path: `e2e/shots/${label}-results.png`, fullPage: true });

      // Save one paper and one author, then look at the saved view.
      const row = page.locator("li").filter({ hasText: /citations/ }).first();
      await row.getByRole("button", { name: /^Save/ }).click();
      // Wait for the server to confirm, or the next page loads before the
      // row exists.
      await row.getByRole("button", { name: /^Saved/ }).waitFor({ timeout: 20_000 });
      await page.goto("/saved");
      await page.screenshot({ path: `e2e/shots/${label}-saved.png`, fullPage: true });

      // Nothing-found state.
      await page.goto("/");
      await page.getByLabel(/research topic/i).fill("zzqxv flurbington");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.getByRole("heading", { name: /no field matches/i }).waitFor({ timeout: 30_000 });
      await page.screenshot({ path: `e2e/shots/${label}-nothing-found.png`, fullPage: true });
    } finally {
      await context.close();
    }
  });
}
