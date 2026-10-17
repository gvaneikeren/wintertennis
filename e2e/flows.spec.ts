import { expect, test } from "@playwright/test";
import { login, openAceVsLobby, skipWelcome } from "./helpers";

test.describe.configure({ mode: "serial" });

test("public pages render in Dutch @public", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stand" })).toBeVisible();
  await page.goto("/standings");
  await expect(page.getByRole("heading", { name: "Stand", level: 1 })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Ace Ventura/ })).toBeVisible();
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "Programma", level: 1 })).toBeVisible();
});

test("anonymous visitors see no personal data @public", async ({ page, request }) => {
  const players = /\b(Anna|Bo|Carmen|Dewi|Eva|Fleur|Koen|Lars|Mats|Niels|Olaf|Pim) [A-Z][\w-]+/;
  for (const path of ["/", "/schedule", "/standings", "/help"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(players);
    expect(html, path).not.toMatch(/[\w.+-]+@example\.com/);
  }
  // Last week's Ace Ventura – Netjes has full line-ups in the seed.
  await page.goto("/schedule");
  await page.getByRole("link", { name: /Ace Ventura[\s\S]*Netjes/ }).first().click();
  await expect(page.getByText("Log in om spelers te zien").first()).toBeVisible();
  // Names must not be in the server response at all, not just hidden in the UI.
  const html = await (await request.get(page.url())).text();
  expect(html).not.toMatch(players);
  expect(html).not.toMatch(/[\w.+-]+@example\.com/);
});

test("logged-in users do see the line-ups", async ({ page }) => {
  await login(page, "captain2@example.com");
  await page.goto("/schedule");
  await page.getByRole("link", { name: /Ace Ventura[\s\S]*Netjes/ }).first().click();
  await expect(page.getByText("Anna Ventura").first()).toBeVisible();
  await expect(page.getByText("Log in om spelers te zien")).toHaveCount(0);
});

test("anonymous users cannot reach team or admin pages @public", async ({ page }) => {
  await page.goto("/team");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("captain1@example.com");
  await page.getByLabel("Wachtwoord").fill("not-the-password");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page.getByText("E-mail of wachtwoord onjuist")).toBeVisible();
});

test("captain enters line-up and score, opponent approves", async ({ browser }) => {
  // Home captain submits
  const home = await (await browser.newContext()).newPage();
  await login(home, "captain1@example.com");
  await openAceVsLobby(home);
  const card = home.locator('[data-match="1"]');

  await card.getByRole("button", { name: "Opstelling" }).click();
  const sheet = home.getByRole("dialog");
  await sheet.getByRole("button", { name: /^Anna/ }).click();
  await sheet.getByRole("button", { name: /^Koen/ }).click();
  await sheet.getByRole("button", { name: "Opslaan" }).click();
  await expect(card.getByText("Anna Ventura")).toBeVisible();

  await card.getByRole("button", { name: "Uitslag invoeren" }).click();
  // Set 1: 5-3, set 2: 3-2 (unfinished, leader wins), set 3 not played
  const inc = (set: number, team: string, n: number) =>
    Array.from({ length: n }, () => card.getByRole("button", { name: `Set ${set} ${team} plus één` }).click());
  for (const c of inc(1, "Ace Ventura", 5)) await c;
  for (const c of inc(1, "Lobbyisten", 3)) await c;
  for (const c of inc(2, "Ace Ventura", 3)) await c;
  for (const c of inc(2, "Lobbyisten", 2)) await c;
  await card.getByLabel("Niet gespeeld").nth(2).check();
  await expect(card.getByText("2½ – ½")).toBeVisible();
  await card.getByRole("button", { name: "Uitslag versturen" }).click();
  await expect(card.getByText("Wacht op akkoord").first()).toBeVisible();
  // Own team cannot approve its own score
  await expect(card.getByRole("button", { name: "Akkoord" })).toHaveCount(0);

  // A captain of an unrelated team cannot approve either
  const other = await (await browser.newContext()).newPage();
  await login(other, "captain2@example.com");
  await openAceVsLobby(other);
  await expect(other.locator('[data-match="1"]').getByRole("button", { name: "Akkoord" })).toHaveCount(0);

  // Away captain sees the action on the home page and approves
  const away = await (await browser.newContext()).newPage();
  await login(away, "captain3@example.com");
  await expect(away.getByText("Actie nodig")).toBeVisible();
  await openAceVsLobby(away);
  await away.locator('[data-match="1"]').getByRole("button", { name: "Akkoord" }).click();
  await expect(away.locator('[data-match="1"]').getByText("Akkoord", { exact: true })).toBeVisible();

  // Score counts in the fixture scoreboard
  await away.reload();
  await expect(away.getByText("2½ – ½").first()).toBeVisible();
});

test("dispute and resubmit", async ({ browser }) => {
  const home = await (await browser.newContext()).newPage();
  await login(home, "captain1@example.com");
  await openAceVsLobby(home);
  const card = home.locator('[data-match="5"]');
  await card.getByRole("button", { name: "Uitslag invoeren" }).click();
  await card.getByRole("button", { name: "Set 1 Ace Ventura plus één" }).click();
  await card.getByRole("button", { name: "Uitslag versturen" }).click();
  await expect(card.getByText("Wacht op akkoord").first()).toBeVisible();

  const away = await (await browser.newContext()).newPage();
  await login(away, "captain3@example.com");
  await openAceVsLobby(away);
  await away.locator('[data-match="5"]').getByRole("button", { name: "Betwisten" }).click();
  await away.getByRole("dialog").getByRole("textbox").fill("Set 1 was 0-1");
  await away.getByRole("dialog").getByRole("button", { name: "Betwisten" }).click();
  await expect(away.locator('[data-match="5"]').getByText("Betwist: Set 1 was 0-1")).toBeVisible();

  // Away team corrects it; now home must approve
  const awayCard = away.locator('[data-match="5"]');
  await awayCard.getByRole("button", { name: "Wijzigen" }).click();
  await awayCard.getByRole("button", { name: "Set 1 Ace Ventura min één" }).click();
  await awayCard.getByRole("button", { name: "Set 1 Lobbyisten plus één" }).click();
  await awayCard.getByRole("button", { name: "Uitslag versturen" }).click();
  await expect(awayCard.getByText("Wacht op akkoord").first()).toBeVisible();

  await home.reload();
  await home.locator('[data-match="5"]').getByRole("button", { name: "Akkoord" }).click();
  await expect(home.locator('[data-match="5"]').getByText("Akkoord", { exact: true })).toBeVisible();
});

test("captain invites a teammate who registers and gets captain rights", async ({ browser }) => {
  const cap = await (await browser.newContext()).newPage();
  await login(cap, "captain1@example.com");
  await cap.goto("/team");
  await cap.getByRole("button", { name: "+ Uitnodigen" }).click();
  const sheet = cap.getByRole("dialog");
  await sheet.getByRole("tab", { name: "Link" }).click();
  await sheet.getByRole("button", { name: "Maak uitnodiging" }).click();
  const link = (await sheet.locator(".font-mono").textContent())!.trim();
  const wa = await sheet.getByRole("link", { name: "Delen via WhatsApp" }).getAttribute("href");
  expect(wa).toContain("https://wa.me/?text=");
  expect(decodeURIComponent(wa!)).toContain(link);

  const member = await (await browser.newContext()).newPage();
  await skipWelcome(member);
  await member.goto(new URL(link).pathname);
  await expect(member.getByRole("heading", { name: "Welkom bij Ace Ventura" })).toBeVisible();
  const email = `lid-${Date.now()}@example.com`;
  await member.getByLabel("Naam").fill("Nieuw Teamlid");
  await member.getByLabel("E-mail").fill(email);
  // Bypass the browser's minLength check to verify the server-side rule.
  await member.getByLabel("Wachtwoord").evaluate((el) => el.removeAttribute("minlength"));
  await member.getByLabel("Wachtwoord").fill("kort");
  await member.getByRole("button", { name: "Account aanmaken" }).click();
  await expect(member.getByText("Wachtwoord moet minimaal 10 tekens zijn")).toBeVisible();
  await member.getByLabel("Wachtwoord").fill("een-lang-wachtwoord");
  await member.getByRole("button", { name: "Account aanmaken" }).click();
  await expect(member).toHaveURL(/\/team/);
  await expect(member.getByRole("heading", { name: "Ace Ventura" })).toBeVisible();
  // Same rights as the inviting captain: captain badge and the invite button.
  await expect(member.getByRole("main").getByText("Aanvoerder", { exact: true }).first()).toBeVisible();
  await expect(member.getByRole("button", { name: "+ Uitnodigen" })).toBeVisible();

  // The link is single-use
  const again = await (await browser.newContext()).newPage();
  await again.goto(new URL(link).pathname);
  await expect(again.getByText(/ongeldig, al gebruikt of verlopen/)).toBeVisible();
});

test("admin schedules a new pairing", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/schedule");
  await expect(page.getByRole("heading", { name: "Planningsoverzicht" })).toBeVisible();
  await page.goto("/admin/teams");
  await expect(page.getByRole("button", { name: "Aanvoerder uitnodigen" }).first()).toBeVisible();
});

test("admin adds a new administrator who sets a password", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await login(admin, "admin@example.com");
  await admin.goto("/admin/admins");
  const email = `beheer-${Date.now()}@example.com`;
  await admin.getByLabel("E-mailadres").fill(email);
  await admin.getByLabel("Naam (optioneel)").fill("Tweede Beheerder");
  await admin.getByRole("button", { name: "Beheerder maken" }).click();
  const link = (await admin.locator(".font-mono").textContent())!.trim();
  await expect(admin.getByText("Nog geen wachtwoord")).toBeVisible();

  // An existing captain is promoted directly
  await admin.getByLabel("E-mailadres").fill("captain2@example.com");
  await admin.getByRole("button", { name: "Beheerder maken" }).click();
  await expect(admin.getByText("captain2@example.com is nu beheerder")).toBeVisible();

  const second = await (await browser.newContext()).newPage();
  await second.goto(new URL(link).pathname);
  await second.getByLabel("Nieuw wachtwoord").fill("tweede-beheerder-pw");
  await second.getByRole("button", { name: "Opslaan" }).click();
  await expect(second).toHaveURL(/\/login\?reset=1/);
  await login(second, email, "tweede-beheerder-pw");
  await second.goto("/admin/admins");
  await expect(second.getByRole("heading", { name: "Beheerders" })).toBeVisible();
});

test("admin renames a team and its schedule and standings follow", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/teams");
  await page.getByRole("button", { name: "Netjes hernoemen" }).click();
  const field = page.getByLabel("Teamnaam");
  await field.fill("Lobbyisten");
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("Er bestaat al een team met deze naam")).toBeVisible();
  await field.fill("Netjes Nieuw");
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("Team heet nu Netjes Nieuw")).toBeVisible();

  await page.goto("/standings");
  await expect(page.getByText("Netjes Nieuw").first()).toBeVisible();
  await page.goto("/schedule");
  await expect(page.getByText("Netjes Nieuw").first()).toBeVisible();
  await expect(page.getByText(/^Netjes$/)).toHaveCount(0);

  // Restore the seed name so reruns against the same database still work.
  await page.goto("/admin/teams");
  await page.getByRole("button", { name: "Netjes Nieuw hernoemen" }).click();
  await page.getByLabel("Teamnaam").fill("Netjes");
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("Team heet nu Netjes")).toBeVisible();
});

test("admin removes a captain from a team", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await login(admin, "admin@example.com");
  await admin.goto("/admin/teams");
  admin.on("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: "Aanvoerder Break Point beheren" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Uit team verwijderen" }).click();
  await expect(admin.getByText("Aanvoerder Break Point verwijderd")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Aanvoerder Break Point beheren" })).toHaveCount(0);

  // The removed captain no longer has a team.
  const cap = await (await browser.newContext()).newPage();
  await login(cap, "captain4@example.com");
  await cap.goto("/team");
  await expect(cap.getByText("Je bent nog geen lid van een team.")).toBeVisible();
});
