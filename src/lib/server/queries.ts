import { prisma } from "./db";
import { standings } from "@/lib/scoring";
import type { CurrentUser } from "./auth-guards";

const matchScoreSelect = { status: true, sets: { select: { setNo: true, played: true, homeGames: true, awayGames: true } } } as const;

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
}

export async function getSchedule(seasonId: string) {
  return prisma.evening.findMany({
    where: { seasonId },
    orderBy: { date: "asc" },
    include: {
      fixtures: {
        orderBy: { slot: "asc" },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          matches: { select: matchScoreSelect },
        },
      },
    },
  });
}

export type ScheduleEvening = Awaited<ReturnType<typeof getSchedule>>[number];

export async function getStandings(seasonId: string) {
  const [teams, fixtures] = await Promise.all([
    prisma.seasonTeam.findMany({ where: { seasonId }, include: { team: { select: { id: true, name: true } } } }),
    prisma.fixture.findMany({
      where: { evening: { seasonId } },
      select: { homeTeamId: true, awayTeamId: true, matches: { select: matchScoreSelect } },
    }),
  ]);
  const names = new Map(teams.map((t) => [t.teamId, t.team.name]));
  return standings(teams.map((t) => t.teamId), fixtures).map((r) => ({ ...r, name: names.get(r.teamId) ?? "?" }));
}

export async function getFixture(id: string) {
  return prisma.fixture.findUnique({
    where: { id },
    include: {
      evening: true,
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      matches: {
        orderBy: { number: "asc" },
        include: {
          sets: { orderBy: { setNo: "asc" } },
          players: { include: { player: { select: { id: true, name: true, gender: true } } } },
        },
      },
    },
  });
}

export type FixtureDetail = NonNullable<Awaited<ReturnType<typeof getFixture>>>;

export async function getTeamPlayers(teamId: string) {
  return prisma.player.findMany({
    where: { teamId, active: true },
    orderBy: [{ gender: "asc" }, { name: "asc" }],
    select: { id: true, name: true, gender: true },
  });
}

/** Matches where the user's team must act: approve the opponent's score, or fix a disputed one. */
export async function getActionsNeeded(user: CurrentUser) {
  const teamIds = user.memberships.map((m) => m.teamId);
  if (teamIds.length === 0) return [];
  const matches = await prisma.match.findMany({
    where: {
      status: { in: ["SUBMITTED", "DISPUTED"] },
      fixture: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
    },
    include: {
      fixture: {
        include: { evening: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
      },
    },
  });
  const byFixture = new Map<string, { fixture: (typeof matches)[number]["fixture"]; approve: number; disputed: number }>();
  for (const m of matches) {
    const mine = teamIds.includes(m.submittedByTeamId ?? "");
    const needsApproval = m.status === "SUBMITTED" && !mine;
    const disputed = m.status === "DISPUTED";
    if (!needsApproval && !disputed) continue;
    const entry = byFixture.get(m.fixtureId) ?? { fixture: m.fixture, approve: 0, disputed: 0 };
    if (needsApproval) entry.approve++;
    if (disputed) entry.disputed++;
    byFixture.set(m.fixtureId, entry);
  }
  return [...byFixture.values()];
}
