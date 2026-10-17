import { expect, type Page } from "@playwright/test";

export const PASSWORD = "wintertennis-dev";

/** Marks the first-use welcome sheet as seen, so it doesn't cover the page in flow tests. */
export async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      return key.startsWith("wt:welcome:") ? "1" : get.call(this, key);
    };
  });
}

export async function login(page: Page, email: string, password = PASSWORD, { welcome = false } = {}) {
  if (!welcome) await skipWelcome(page);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL("/");
}

/** Opens the next-Saturday fixture between Ace Ventura (captain1) and Lobbyisten (captain3). */
export async function openAceVsLobby(page: Page) {
  await page.goto("/schedule");
  await page.getByRole("link", { name: /Ace Ventura[\s\S]*Lobbyisten/ }).first().click();
  await expect(page.getByText("Voor de pauze · Gemengd")).toBeVisible();
}
