import { test, expect, type Page } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

/**
 * The assignment's core guarantee: two people use the app, and neither can
 * see the other's saved work.
 *
 * Clerk development instances accept any address containing +clerk_test and
 * the fixed verification code 424242, so this signs up two real users
 * without touching a mailbox.
 */

const CODE = "424242";
const run = Date.now();
const USER_A = `scout.a+clerk_test.${run}@example.com`;
const USER_B = `scout.b+clerk_test.${run}@example.com`;
const PASSWORD = `Sc0ut!${run}`;

const PAPER_A = "Mechanistic Interpretability for AI Safety";
const TOPIC = "mechanistic interpretability";

test.beforeAll(async () => {
  await clerkSetup();
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /continue|sign up/i }).first().click();

  // Clerk asks for the emailed code; development instances accept 424242.
  const codeField = page.getByLabel(/code/i).first();
  await codeField.waitFor({ state: "visible" });
  await codeField.fill(CODE);
  await page.waitForURL("/", { timeout: 30_000 });
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /open user button/i }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await page.waitForURL(/sign-in/, { timeout: 30_000 });
}

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: /continue|sign in/i }).first().click();
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /continue|sign in/i }).first().click();
  await page.waitForURL("/", { timeout: 30_000 });
}

test("a signed-out visitor cannot reach anyone's data", async ({ page }) => {
  const response = await page.request.get("/api/favorites");
  expect(response.status()).toBe(401);

  await page.goto("/saved");
  await expect(page).toHaveURL(/sign-in/);
});

test("two people cannot see each other's saved work", async ({ page }) => {
  // User A saves a paper.
  await signUp(page, USER_A);
  await page.getByLabel(/research topic/i).fill(TOPIC);
  await page.getByRole("button", { name: "Search", exact: true }).click();

  const paperRow = page.locator("li", { hasText: PAPER_A }).first();
  await expect(paperRow).toBeVisible({ timeout: 30_000 });
  await paperRow.getByRole("button", { name: /^Save/ }).click();
  await expect(paperRow.getByRole("button", { name: /^Saved/ })).toBeVisible();

  await page.goto("/saved");
  await expect(page.getByText(PAPER_A)).toBeVisible();
  await signOut(page);

  // User B must see an empty shelf, not A's paper.
  await signUp(page, USER_B);
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: /nothing saved yet/i })).toBeVisible();
  await expect(page.getByText(PAPER_A)).toHaveCount(0);

  // And the API agrees: B's favorites come back empty.
  const asB = await page.request.get("/api/favorites");
  expect(asB.ok()).toBeTruthy();
  const body = await asB.json();
  expect(body.papers).toHaveLength(0);

  await signOut(page);

  // A still has their paper: it was saved, not lost.
  await signIn(page, USER_A);
  await page.goto("/saved");
  await expect(page.getByText(PAPER_A)).toBeVisible();
});
