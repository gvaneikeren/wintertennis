// Development seed: 6 teams, 3 Saturdays, an admin and captains. All passwords: "wintertennis-dev".
import { PrismaClient, type Gender } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FIXTURE_TEMPLATE } from "../src/lib/schedule";

const prisma = new PrismaClient();
const PASSWORD = "wintertennis-dev";

const TEAMS = ["Ace Ventura", "Netjes", "Lobbyisten", "Break Point", "De Smashers", "Tie-Breakers"];
const LADIES = ["Anna", "Bo", "Carmen", "Dewi", "Eva", "Fleur", "Gwen", "Hanna", "Iris", "Julia"];
const MEN = ["Koen", "Lars", "Mats", "Niels", "Olaf", "Pim", "Quinten", "Ruben", "Sven", "Tom"];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Do not seed production");
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.season.deleteMany(),
    prisma.fixture.deleteMany(),
    prisma.invite.deleteMany(),
    prisma.player.deleteMany(),
    prisma.teamMembership.deleteMany(),
    prisma.team.deleteMany(),
    prisma.user.deleteMany(),
    prisma.rateLimit.deleteMany(),
  ]);
  const hash = await bcrypt.hash(PASSWORD, 12);

  await prisma.user.create({ data: { email: "admin@example.com", name: "Beheerder", passwordHash: hash, isAdmin: true } });
  const season = await prisma.season.create({ data: { name: "Winter 2026–2027", courts: 4 } });

  const teams = [];
  for (const [i, name] of TEAMS.entries()) {
    const team = await prisma.team.create({ data: { name } });
    await prisma.seasonTeam.create({ data: { seasonId: season.id, teamId: team.id } });
    const players: { name: string; gender: Gender }[] = [
      ...LADIES.slice(0, 4).map((n) => ({ name: `${n} ${name.split(" ").pop()}`, gender: "F" as const })),
      ...MEN.slice(0, 4).map((n) => ({ name: `${n} ${name.split(" ").pop()}`, gender: "M" as const })),
    ];
    await prisma.player.createMany({ data: players.map((p) => ({ ...p, teamId: team.id })) });
    const captain = await prisma.user.create({
      data: { email: `captain${i + 1}@example.com`, name: `Aanvoerder ${name}`, passwordHash: hash },
    });
    await prisma.teamMembership.create({ data: { userId: captain.id, teamId: team.id, role: "CAPTAIN" } });
    teams.push(team);
  }

  // Three Saturdays: last week (approved scores), this coming Saturday, and the one after.
  const now = new Date();
  const nextSat = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((6 - now.getUTCDay() + 7) % 7)));
  const dates = [-7, 0, 7].map((d) => new Date(nextSat.getTime() + d * 86400000));
  const pairings = [
    [[0, 1], [2, 3]],
    [[4, 5], [0, 2]],
    [[1, 3], [4, 0]],
  ];
  for (const [i, date] of dates.entries()) {
    const evening = await prisma.evening.create({ data: { seasonId: season.id, date } });
    for (const [j, [h, a]] of pairings[i].entries()) {
      const fixture = await prisma.fixture.create({
        data: {
          eveningId: evening.id,
          slot: j === 0 ? "EARLY" : "LATE",
          homeTeamId: teams[h].id,
          awayTeamId: teams[a].id,
          matches: { create: FIXTURE_TEMPLATE.map((m) => ({ number: m.number, block: m.block, type: m.type })) },
        },
        include: { matches: true },
      });
      if (i === 0) {
        // Past evening: all scores approved, with a mix of results.
        for (const m of fixture.matches) {
          const r = (m.number * 7 + j * 3) % 6;
          await prisma.matchSet.createMany({
            data: [
              { matchId: m.id, setNo: 1, homeGames: 5, awayGames: r % 5 },
              { matchId: m.id, setNo: 2, homeGames: r % 4, awayGames: 5 },
              r === 0 ? { matchId: m.id, setNo: 3, played: false } : { matchId: m.id, setNo: 3, homeGames: (r + 2) % 5, awayGames: 3 },
            ],
          });
          await prisma.match.update({
            where: { id: m.id },
            data: { status: "APPROVED", submittedByTeamId: fixture.homeTeamId, submittedAt: date, approvedAt: date },
          });
        }
      }
    }
  }
  console.log(`Seeded ${teams.length} teams. Login: admin@example.com / captain1@example.com … captain6@example.com, password "${PASSWORD}"`);
}

main().finally(() => prisma.$disconnect());
