import { test, expect, type Page } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

/**
 * The assignment's core guarantee: two people use the app, and neither can
 * see the other's saved work.
 *
 * Each person gets their own browser context, which is both closer to
 * reality than signing in and out of one browser, and avoids depending on
 * Clerk's account-menu markup.
 *
 * Clerk development instances accept any address containing +clerk_test with
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
  // Field names, not labels: Clerk's "Show password" button also matches a
  // label of /password/i. And the primary button is matched by its exact
  // name, because "Continue with Google" also matches /continue/i.
  await page.locator('input[name="emailAddress"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByText(/verify|verification|check your email/i)
    .first()
    .waitFor({ timeout: 30_000 });
  await page.keyboard.type(CODE, { delay: 60 });
  await page.waitForURL("/", { timeout: 60_000 });
}

test("a signed-out visitor cannot reach anyone's data", async ({ page }) => {
  const response = await page.request.get("/api/favorites");
  expect(response.status()).toBe(401);

  await page.goto("/saved");
  await expect(page).toHaveURL(/sign-in/);
});

test("two people cannot see each other's saved work", async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  try {
    // A searches and saves a paper.
    await signUp(pageA, USER_A);
    await pageA.getByLabel(/research topic/i).fill(TOPIC);
    await pageA.getByRole("button", { name: "Search", exact: true }).click();

    const paperRow = pageA.locator("li", { hasText: PAPER_A }).first();
    await expect(paperRow).toBeVisible({ timeout: 30_000 });
    await paperRow.getByRole("button", { name: /^Save/ }).click();
    await expect(paperRow.getByRole("button", { name: /^Saved/ })).toBeVisible();

    await pageA.goto("/saved");
    await expect(pageA.getByText(PAPER_A).first()).toBeVisible();

    // B sees an empty shelf, not A's paper.
    await signUp(pageB, USER_B);
    await pageB.goto("/saved");
    await expect(
      pageB.getByRole("heading", { name: /nothing saved yet/i }),
    ).toBeVisible();
    await expect(pageB.getByText(PAPER_A)).toHaveCount(0);

    // And the API agrees: B's favorites come back empty.
    const asB = await pageB.request.get("/api/favorites");
    expect(asB.ok()).toBeTruthy();
    expect((await asB.json()).papers).toHaveLength(0);

    // A still has their paper: it was saved, not lost.
    await pageA.reload();
    await expect(pageA.getByText(PAPER_A).first()).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
