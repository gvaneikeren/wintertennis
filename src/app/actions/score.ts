"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { requireMatchParticipant, requireUser, run, UserError, isMember } from "@/lib/server/auth-guards";
import { validateSet } from "@/lib/scoring";
import { validateSide, type Gender } from "@/lib/lineup";
import { canTransition, nextStatus } from "@/lib/match-status";
import { audit } from "@/lib/server/audit";
import type { MatchType } from "@/lib/schedule";

const id = z.string().min(1).max(40);

const setsSchema = z
  .array(
    z.object({
      played: z.boolean(),
      homeGames: z.number().int().min(0).max(5),
      awayGames: z.number().int().min(0).max(5),
    }),
  )
  .length(3);

function revalidateFixture(fixtureId: string) {
  revalidatePath(`/fixtures/${fixtureId}`);
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/standings");
}

export async function submitScore(matchId: string, sets: unknown) {
  return run(async () => {
    const mid = id.parse(matchId);
    const parsed = setsSchema.safeParse(sets);
    if (!parsed.success) throw new UserError("Ongeldige uitslag");
    for (const s of parsed.data) {
      const err = validateSet(s);
      if (err) throw new UserError(err);
    }
    const { user, match, teamId } = await requireMatchParticipant(mid);
    const err = canTransition("submit", {
      status: match.status,
      actorTeamId: teamId,
      submittedByTeamId: match.submittedByTeamId,
      isAdmin: user.isAdmin,
    });
    if (err) throw new UserError(err);

    const old = await prisma.matchSet.findMany({ where: { matchId: mid }, orderBy: { setNo: "asc" } });
    // An admin outside both teams enters scores as final: they are approved directly.
    const adminFinal = user.isAdmin && !teamId;
    await prisma.$transaction([
      prisma.matchSet.deleteMany({ where: { matchId: mid } }),
      prisma.matchSet.createMany({
        data: parsed.data.map((s, i) => ({
          matchId: mid,
          setNo: i + 1,
          played: s.played,
          homeGames: s.played ? s.homeGames : 0,
          awayGames: s.played ? s.awayGames : 0,
        })),
      }),
      prisma.match.update({
        where: { id: mid },
        data: {
          status: adminFinal ? "APPROVED" : "SUBMITTED",
          submittedByTeamId: teamId,
          submittedByUserId: user.id,
          submittedAt: new Date(),
          approvedByUserId: adminFinal ? user.id : null,
          approvedAt: adminFinal ? new Date() : null,
          disputeComment: null,
        },
      }),
    ]);
    await audit({
      userId: user.id,
      action: "score.submit",
      entity: "Match",
      entityId: mid,
      details: { old: old.map(({ setNo, played, homeGames, awayGames }) => ({ setNo, played, homeGames, awayGames })), new: parsed.data },
    });
    revalidateFixture(match.fixtureId);
  });
}

async function review(matchId: string, action: "approve" | "dispute", comment?: string) {
  const mid = id.parse(matchId);
  const { user, match, teamId } = await requireMatchParticipant(mid);
  const err = canTransition(action, {
    status: match.status,
    actorTeamId: teamId,
    submittedByTeamId: match.submittedByTeamId,
    isAdmin: user.isAdmin,
  });
  if (err) throw new UserError(err);
  await prisma.match.update({
    where: { id: mid, status: "SUBMITTED" }, // guards against concurrent changes
    data:
      action === "approve"
        ? { status: nextStatus("approve"), approvedByUserId: user.id, approvedAt: new Date() }
        : { status: nextStatus("dispute"), disputeComment: comment },
  });
  await audit({ userId: user.id, action: `score.${action}`, entity: "Match", entityId: mid, details: comment ? { comment } : undefined });
  revalidateFixture(match.fixtureId);
}

export async function approveScore(matchId: string) {
  return run(() => review(matchId, "approve"));
}

export async function disputeScore(matchId: string, comment: string) {
  return run(async () => {
    const c = z.string().trim().min(3, "Geef een korte toelichting").max(500).safeParse(comment);
    if (!c.success) throw new UserError(c.error.issues[0].message);
    await review(matchId, "dispute", c.data);
  });
}

/** Approves every match of a fixture that the opponent submitted. */
export async function approveAll(fixtureId: string) {
  return run(async () => {
    const fid = id.parse(fixtureId);
    const user = await requireUser();
    const fixture = await prisma.fixture.findUnique({ where: { id: fid } });
    if (!fixture) throw new UserError("Wedstrijd niet gevonden");
    const teamId = isMember(user, fixture.homeTeamId) ? fixture.homeTeamId : isMember(user, fixture.awayTeamId) ? fixture.awayTeamId : null;
    if (!teamId) throw new UserError("Geen toegang");
    const res = await prisma.match.updateMany({
      where: { fixtureId: fid, status: "SUBMITTED", submittedByTeamId: { not: teamId } },
      data: { status: "APPROVED", approvedByUserId: user.id, approvedAt: new Date() },
    });
    await audit({ userId: user.id, action: "score.approve_all", entity: "Fixture", entityId: fid, details: { count: res.count } });
    revalidateFixture(fid);
    return res.count;
  });
}

export async function reopenScore(matchId: string) {
  return run(async () => {
    const mid = id.parse(matchId);
    const { user, match } = await requireMatchParticipant(mid);
    const err = canTransition("reopen", { status: match.status, actorTeamId: null, submittedByTeamId: match.submittedByTeamId, isAdmin: user.isAdmin });
    if (err) throw new UserError(err);
    await prisma.match.update({
      where: { id: mid },
      data: { status: "OPEN", approvedAt: null, approvedByUserId: null, submittedByTeamId: null, submittedByUserId: null, submittedAt: null },
    });
    await audit({ userId: user.id, action: "score.reopen", entity: "Match", entityId: mid });
    revalidateFixture(match.fixtureId);
  });
}

/** Sets the two players for the user's own side of a match. */
export async function saveLineup(matchId: string, playerIds: unknown, forSide?: "HOME" | "AWAY") {
  return run(async () => {
    const mid = id.parse(matchId);
    const ids = z.array(id).length(2).safeParse(playerIds);
    if (!ids.success) throw new UserError("Kies twee spelers");
    const { user, match, side: mySide } = await requireMatchParticipant(mid);
    // Team members edit their own side; only an admin may choose the side.
    const side = mySide ?? (user.isAdmin && forSide ? forSide : null);
    if (!side) throw new UserError("Geen toegang");
    if (match.status === "APPROVED") throw new UserError("Deze uitslag is al akkoord");
    const teamId = side === "HOME" ? match.fixture.homeTeamId : match.fixture.awayTeamId;

    const players = await prisma.player.findMany({ where: { id: { in: ids.data }, teamId, active: true } });
    if (players.length !== 2) throw new UserError("Kies twee spelers van je eigen team");
    const ordered = ids.data.map((pid) => players.find((p) => p.id === pid)!);
    const err = validateSide(match.type as MatchType, ordered.map((p) => ({ id: p.id, gender: p.gender as Gender })));
    if (err) throw new UserError(err);

    await prisma.$transaction([
      prisma.matchPlayer.deleteMany({ where: { matchId: mid, side } }),
      prisma.matchPlayer.createMany({ data: ordered.map((p, i) => ({ matchId: mid, side, position: i + 1, playerId: p.id })) }),
    ]);
    await audit({ userId: user.id, action: "lineup.save", entity: "Match", entityId: mid, details: { side, playerIds: ids.data } });
    revalidatePath(`/fixtures/${match.fixtureId}`);
  });
}
