import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("help page is reachable from the header and opens a guide by anchor @public", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Uitleg" }).click();
  await expect(page).toHaveURL(/\/help$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Uitleg", level: 1 })).toBeVisible();
  await expect(page.getByText("Zo werkt een speelavond")).toBeVisible();
  await expect(page.getByText("Veelgestelde vragen")).toBeVisible();

  await page.goto("/help#uitslag-invoeren");
  await expect(page.locator("details#uitslag-invoeren")).toHaveAttribute("open", "");
  await expect(page.getByText("Zet per set de games met − en +")).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(0);
});

test("captain sees the welcome sheet once", async ({ page }) => {
  await login(page, "captain6@example.com", undefined, { welcome: true });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Als aanvoerder regel je je team in drie stappen.")).toBeVisible();
  await expect(sheet.getByText("1. Zet je spelers erin")).toBeVisible();
  await sheet.getByRole("button", { name: "Volgende" }).click();
  await expect(sheet.getByText("2. Nodig je teamgenoten uit")).toBeVisible();
  await sheet.getByRole("button", { name: "Volgende" }).click();
  await sheet.getByRole("button", { name: "Aan de slag" }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Aan de slag" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("checklist ticks itself off and links to the manual", async ({ page }) => {
  await login(page, "captain6@example.com");
  const list = page.locator("[data-checklist]");
  await expect(list.locator('[data-step="players"]')).toHaveAttribute("data-done", "true");
  await expect(list.locator('[data-step="substitutes"]')).toHaveAttribute("data-done", "false");
  await expect(list.locator('[data-step="invite"]')).toHaveAttribute("data-done", "false");

  // Adding a substitute (a 9th player) ticks the optional step.
  await page.goto("/team");
  await page.getByPlaceholder("Naam").fill("Invaller Ingrid");
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await expect(page.getByText("Invaller Ingrid", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(list.locator('[data-step="substitutes"]')).toHaveAttribute("data-done", "true");

  await list.getByRole("link", { name: "Uitleg: Nodig minimaal één teamgenoot uit" }).click();
  await expect(page).toHaveURL(/\/help#uitnodigen$/);
  await expect(page.locator("details#uitnodigen")).toHaveAttribute("open", "");
});

test("a dismissed tip stays hidden", async ({ page }) => {
  await login(page, "captain6@example.com");
  await page.goto("/team");
  const tip = page.locator('[data-tip="team-players"]');
  await expect(tip).toBeVisible();
  await tip.getByRole("button", { name: "Tip sluiten" }).click();
  await expect(tip).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-tip="team-invite"]')).toBeVisible();
  await expect(tip).toHaveCount(0);
});
