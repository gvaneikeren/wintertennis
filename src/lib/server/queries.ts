import { prisma } from "./db";
import { standings } from "@/lib/scoring";
import type { CurrentUser } from "./auth-guards";
import { formatDate } from "@/lib/nl";
import type { AdminOnboardingInput, TeamOnboardingInput } from "@/lib/onboarding";

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

/** Counts for the "Aan de slag" checklist of one team, scoped to the user's own membership. */
export async function getTeamOnboarding(user: CurrentUser, teamId: string): Promise<TeamOnboardingInput | null> {
  const membership = user.memberships.find((m) => m.teamId === teamId);
  if (!membership) return null;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const [players, memberships, openInvites, next] = await Promise.all([
    prisma.player.findMany({ where: { teamId, active: true }, select: { gender: true, userId: true } }),
    prisma.teamMembership.count({ where: { teamId } }),
    prisma.invite.count({ where: { teamId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.fixture.findFirst({
      where: { evening: { date: { gte: today }, season: { active: true } }, OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      orderBy: { evening: { date: "asc" } },
      select: { id: true, homeTeamId: true, evening: { select: { date: true } }, matches: { select: { players: { select: { side: true } } } } },
    }),
  ]);
  const ownSide = next ? (next.homeTeamId === teamId ? "HOME" : "AWAY") : null;
  return {
    isCaptain: membership.role === "CAPTAIN",
    ladies: players.filter((p) => p.gender === "F").length,
    men: players.filter((p) => p.gender === "M").length,
    memberships,
    openInvites,
    linkedToPlayer: players.some((p) => p.userId === user.id),
    nextFixture: next
      ? {
          id: next.id,
          dateLabel: formatDate(next.evening.date),
          matches: next.matches.length,
          matchesWithFullLineup: next.matches.filter((m) => m.players.filter((p) => p.side === ownSide).length >= 2).length,
        }
      : null,
  };
}

export async function getAdminOnboarding(): Promise<AdminOnboardingInput> {
  const season = await getActiveSeason();
  if (!season) return { hasSeason: false, teams: 0, teamsWithoutCaptain: 0, eveningsWithFixtures: 0 };
  const [teams, eveningsWithFixtures] = await Promise.all([
    prisma.seasonTeam.findMany({
      where: { seasonId: season.id },
      select: {
        team: {
          select: {
            _count: {
              select: {
                memberships: { where: { role: "CAPTAIN" } },
                invites: { where: { role: "CAPTAIN", acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } },
              },
            },
          },
        },
      },
    }),
    prisma.evening.count({ where: { seasonId: season.id, fixtures: { some: {} } } }),
  ]);
  return {
    hasSeason: true,
    teams: teams.length,
    teamsWithoutCaptain: teams.filter((t) => t.team._count.memberships === 0 && t.team._count.invites === 0).length,
    eveningsWithFixtures,
  };
}
