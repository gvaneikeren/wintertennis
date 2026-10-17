// IDOR / privilege-escalation regression tests. These drive the real server-action HTTP path:
// a logged-in captain (and an anonymous client) invoke every mutating action against another
// team's and other fixtures' ids. Every call must be denied by a server-side guard. If someone
// drops a guard, the matching assertion fails. Runs against the seeded local DB only.

import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { login, skipWelcome } from "./helpers";
import { callAction, loadActions } from "./idor-helpers";

test.describe.configure({ mode: "serial" });

// Prisma needs DATABASE_URL; the e2e process doesn't auto-load .env the way the Next server does.
if (!process.env.DATABASE_URL) {
  for (const f of [".env.local", ".env"]) {
    try {
      const m = fs.readFileSync(f, "utf8").match(/^DATABASE_URL=(.*)$/m);
      if (m) {
        process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
        break;
      }
    } catch {
      /* next file */
    }
  }
}

type Ids = {
  otherTeamId: string;
  otherPlayerId: string;
  otherMemberId: string;
  otherInviteId: string;
  otherFixtureId: string;
  otherMatchId: string;
  ownFixtureId: string;
  ownOpenMatchId: string;
  adminId: string;
};

let ids: Ids;
let actions: Record<string, { id: string; route: string }>;

test.beforeAll(async ({ browser }) => {
  const prisma = new PrismaClient();
  try {
    const mine = await prisma.team.findFirstOrThrow({ where: { name: "Tie-Breakers" }, include: { memberships: true } });
    const other = await prisma.team.findFirstOrThrow({
      where: { name: "Netjes" },
      include: { players: { where: { active: true }, take: 1 }, memberships: { where: { role: "CAPTAIN" }, take: 1 } },
    });
    const otherFixture = await prisma.fixture.findFirstOrThrow({
      where: { NOT: [{ homeTeamId: mine.id }, { awayTeamId: mine.id }] },
      include: { matches: { take: 1 } },
    });
    const ownFixture = await prisma.fixture.findFirstOrThrow({
      where: { OR: [{ homeTeamId: mine.id }, { awayTeamId: mine.id }], matches: { some: { status: "OPEN" } } },
      include: { matches: { where: { status: "OPEN" }, take: 1 } },
    });
    const admin = await prisma.user.findFirstOrThrow({ where: { isAdmin: true } });
    // A real pending invite on the other team, so revokeInvite hits the captain guard (not "not found").
    const otherInvite = await prisma.invite.create({
      data: {
        tokenHash: `idor-test-${Date.now()}`,
        teamId: other.id,
        role: "CAPTAIN",
        channel: "LINK",
        createdById: other.memberships[0].userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    ids = {
      otherTeamId: other.id,
      otherPlayerId: other.players[0].id,
      otherMemberId: other.memberships[0].userId,
      otherInviteId: otherInvite.id,
      otherFixtureId: otherFixture.id,
      otherMatchId: otherFixture.matches[0].id,
      ownFixtureId: ownFixture.id,
      ownOpenMatchId: ownFixture.matches[0].id,
      adminId: admin.id,
    };
  } finally {
    await prisma.$disconnect();
  }

  // Warm the routes that host the actions so the dev manifest lists them, then read it.
  // Done anonymously (a GET still compiles the route's action bundle) to avoid spending logins
  // against the 5/15-min login rate limiter shared with the rest of the suite.
  const warm = await browser.newContext();
  for (const url of ["/", "/team", "/admin", "/admin/schedule", "/admin/teams", "/admin/admins", `/fixtures/${ids.otherFixtureId}`]) {
    await warm.request.get(url);
  }
  await warm.close();
  actions = loadActions({ fixtureId: ids.otherFixtureId });
});

test("a captain cannot touch another team or use admin actions", async ({ browser }) => {
  // captain5 (Tie-Breakers) is unused elsewhere, so this login stays under the login rate limit.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await skipWelcome(page);
  await login(page, "captain5@example.com");
  const call = (name: string, args: unknown[]) => callAction(page.request, actions, name, args);

  // Cross-team / cross-fixture: the team or side is derived from the DB, so each is denied.
  const crossTeam: [string, unknown[]][] = [
    ["updatePlayer", [ids.otherPlayerId, { name: "Hacked", gender: "F" }]],
    ["removePlayer", [ids.otherPlayerId]],
    ["claimPlayer", [ids.otherPlayerId]],
    ["createInvite", [{ teamId: ids.otherTeamId, role: "CAPTAIN", channel: "LINK" }]],
    ["revokeInvite", [ids.otherInviteId]],
    ["setMemberRole", [ids.otherTeamId, ids.otherMemberId, "MEMBER"]],
    ["removeMember", [ids.otherTeamId, ids.otherMemberId]],
    ["submitScore", [ids.otherMatchId, sets(5, 0)]],
    ["approveScore", [ids.otherMatchId]],
    ["disputeScore", [ids.otherMatchId, "niet akkoord"]],
    ["approveAll", [ids.otherFixtureId]],
    ["saveLineup", [ids.otherMatchId, [ids.otherPlayerId, ids.otherPlayerId]]],
  ];
  // Admin-only mutations: a captain is not an admin.
  const adminOnly: [string, unknown[]][] = [
    ["createTeam", ["any-season", "EvilTeam"]],
    ["renameTeam", [ids.otherTeamId, "Pwned"]],
    ["createSeason", [{ name: "Evil", courts: 4 }]],
    ["updateSeason", ["any-season", { name: "Evil", courts: 4 }]],
    ["removeTeamFromSeason", ["any-season", ids.otherTeamId]],
    ["addEvenings", ["any-season", { from: "2027-01-02" }]],
    ["deleteEvening", ["any-evening"]],
    ["addPairing", [{ eveningId: "x", slot: "EARLY", homeTeamId: "a", awayTeamId: "b" }]],
    ["deletePairing", [ids.otherFixtureId]],
    ["addAdmin", [{ email: "evil@example.com" }]],
    ["removeAdmin", [ids.adminId]],
  ];
  for (const [name, args] of [...crossTeam, ...adminOnly]) {
    const r = await call(name, args);
    expect(r.ok, `${name} must be denied (${r.raw})`).toBe(false);
    // A guard produced the denial, not a transport error (which would carry no app error message).
    expect(r.error, `${name} should fail with an access error`).toBe("Geen toegang");
  }

  // reopen is admin-only and rejected with its own message.
  const reopen = await call("reopenScore", [ids.ownOpenMatchId]);
  expect(reopen.ok).toBe(false);
  expect(reopen.error).toBe("Alleen de beheerder kan een uitslag heropenen");

  await ctx.close();
});

test("anonymous clients cannot call mutating actions", async ({ playwright }) => {
  const req = await playwright.request.newContext(); // no cookies
  // Valid-shaped args, so the only reason to fail is the missing session (not input validation).
  const calls: [string, unknown[]][] = [
    ["submitScore", [ids.otherMatchId, sets(5, 0)]],
    ["approveScore", [ids.otherMatchId]],
    ["saveLineup", [ids.otherMatchId, [ids.otherPlayerId, ids.otherPlayerId]]],
    ["addPlayer", [ids.otherTeamId, { name: "Valide Naam", gender: "F" }]],
    ["createTeam", ["any-season", "EvilTeam"]],
    ["addAdmin", [{ email: "evil@example.com" }]],
  ];
  for (const [name, args] of calls) {
    const r = await callAction(req, actions, name, args);
    expect(r.ok, `${name} must be denied for anonymous (${r.raw})`).toBe(false);
    expect(r.error, `${name} should require login`).toBe("Log eerst in");
  }
  await req.dispose();
});

function sets(home: number, away: number) {
  return [
    { played: true, homeGames: home, awayGames: away },
    { played: false, homeGames: 0, awayGames: 0 },
    { played: false, homeGames: 0, awayGames: 0 },
  ];
}
