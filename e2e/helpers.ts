import { expect, type Page } from "@playwright/test";

export const PASSWORD = "wintertennis-dev";

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL("/");
}

/** Opens the next-Saturday fixture between Ace Ventura (captain1) and Lobbyisten (captain3). */
export async function openAceVsLobby(page: Page) {
  await page.goto("/schedule");
  await page.getByRole("link", { name: /Ace Ventura.*Lobbyisten/s }).first().click();
  await expect(page.getByText("Voor de pauze · Gemengd")).toBeVisible();
}
