import { test, expect, type Page } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Two assignment requirements that the isolation test does not cover:
 *
 *  - what you save is still there after signing out and back in
 *  - the interface has a designed state for the API being unavailable,
 *    which is a different thing from the API finding nothing
 */

const CODE = "424242";
const run = Date.now();
const EMAIL = `persist+clerk_test.${run}@example.com`;
const PASSWORD = `Sc0ut!${run}`;
const TOPIC = "mechanistic interpretability";
const PAPER = "Mechanistic Interpretability for AI Safety";

test.beforeAll(async () => {
  await clerkSetup();
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.locator('input[name="emailAddress"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText(/verify|verification|check your email/i).first().waitFor({ timeout: 30_000 });
  await page.keyboard.type(CODE, { delay: 60 });
  await page.waitForURL("/", { timeout: 60_000 });
}

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.locator('input[name="identifier"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Signing in from a browser Clerk has not seen before routes through a
  // device-verification step. Development instances accept the same code.
  try {
    await page
      .getByText(/verify|verification|check your email/i)
      .first()
      .waitFor({ timeout: 8_000 });
    await page.keyboard.type(CODE, { delay: 60 });
  } catch {
    // Device already trusted; nothing to confirm.
  }

  await page.waitForURL("/", { timeout: 60_000 });
}

test("saved work survives signing out and back in", async ({ browser }) => {
  // First session: save a paper.
  const first = await browser.newContext();
  const pageOne = await first.newPage();
  await signUp(pageOne, EMAIL);
  await pageOne.getByLabel(/research topic/i).fill(TOPIC);
  await pageOne.getByRole("button", { name: "Search", exact: true }).click();

  const row = pageOne.locator("li", { hasText: PAPER }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole("button", { name: /^Save/ }).click();
  await expect(row.getByRole("button", { name: /^Saved/ })).toBeVisible();
  // Closing the context discards every cookie, which is what signing out
  // and coming back on another device amounts to here.
  await first.close();

  // Second session, same person: the paper is still on the shelf.
  const second = await browser.newContext();
  const pageTwo = await second.newPage();
  await signIn(pageTwo, EMAIL);
  await pageTwo.goto("/saved");
  await expect(pageTwo.getByText(PAPER).first()).toBeVisible({ timeout: 30_000 });
  await second.close();
});

test("the interface has a state for the API being unavailable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, `down+clerk_test.${run}@example.com`);

  // Nothing-found and unavailable must not look the same.
  await page.route("**/api/search**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Search is unavailable right now." }),
    }),
  );

  await page.getByLabel(/research topic/i).fill(TOPIC);
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page.getByRole("heading", { name: /search is unavailable/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  await context.close();
});
