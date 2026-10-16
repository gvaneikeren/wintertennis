"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { requireAdmin, run, UserError } from "@/lib/server/auth-guards";
import { audit } from "@/lib/server/audit";
import { FIXTURE_TEMPLATE, saturdaysBetween, validatePairings } from "@/lib/schedule";
import { newToken } from "@/lib/server/tokens";
import { appUrl, mailConfigured, sendMail } from "@/lib/server/mail";
import { whatsappUrl } from "@/lib/invite-message";

const id = z.string().min(1).max(40);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum");

function revalidateAll() {
  for (const p of ["/", "/schedule", "/standings", "/admin", "/admin/teams", "/admin/schedule"]) revalidatePath(p);
}

export async function createSeason(input: unknown) {
  return run(async () => {
    const admin = await requireAdmin();
    const p = z.object({ name: z.string().trim().min(2).max(60), courts: z.coerce.number().int().min(4).max(32) }).safeParse(input);
    if (!p.success) throw new UserError("Vul een naam en het aantal banen in (minimaal 4)");
    const season = await prisma.$transaction(async (tx) => {
      await tx.season.updateMany({ data: { active: false } });
      return tx.season.create({ data: { ...p.data, active: true } });
    });
    await audit({ userId: admin.id, action: "season.create", entity: "Season", entityId: season.id, details: p.data });
    revalidateAll();
  });
}

export async function updateSeason(seasonId: string, input: unknown) {
  return run(async () => {
    const admin = await requireAdmin();
    const p = z.object({ name: z.string().trim().min(2).max(60), courts: z.coerce.number().int().min(4).max(32) }).safeParse(input);
    if (!p.success) throw new UserError("Ongeldige invoer");
    await prisma.season.update({ where: { id: id.parse(seasonId) }, data: p.data });
    await audit({ userId: admin.id, action: "season.update", entity: "Season", entityId: seasonId, details: p.data });
    revalidateAll();
  });
}

export async function createTeam(seasonId: string, name: string) {
  return run(async () => {
    const admin = await requireAdmin();
    const sid = id.parse(seasonId);
    const n = z.string().trim().min(2, "Teamnaam is te kort").max(40, "Teamnaam is te lang").safeParse(name);
    if (!n.success) throw new UserError(n.error.issues[0].message);
    const team = await prisma.team.upsert({ where: { name: n.data }, update: {}, create: { name: n.data } });
    await prisma.seasonTeam.upsert({
      where: { seasonId_teamId: { seasonId: sid, teamId: team.id } },
      update: {},
      create: { seasonId: sid, teamId: team.id },
    });
    await audit({ userId: admin.id, action: "team.create", entity: "Team", entityId: team.id, details: { name: n.data } });
    revalidateAll();
  });
}

export async function renameTeam(teamId: string, name: string) {
  return run(async () => {
    const admin = await requireAdmin();
    const n = z.string().trim().min(2).max(40).safeParse(name);
    if (!n.success) throw new UserError("Ongeldige teamnaam");
    await prisma.team.update({ where: { id: id.parse(teamId) }, data: { name: n.data } });
    await audit({ userId: admin.id, action: "team.rename", entity: "Team", entityId: teamId, details: { name: n.data } });
    revalidateAll();
  });
}

/** Removes a team from the season (only when it has no fixtures in that season). */
export async function removeTeamFromSeason(seasonId: string, teamId: string) {
  return run(async () => {
    const admin = await requireAdmin();
    const sid = id.parse(seasonId);
    const tid = id.parse(teamId);
    const used = await prisma.fixture.count({ where: { evening: { seasonId: sid }, OR: [{ homeTeamId: tid }, { awayTeamId: tid }] } });
    if (used > 0) throw new UserError("Dit team staat al in het programma");
    await prisma.seasonTeam.delete({ where: { seasonId_teamId: { seasonId: sid, teamId: tid } } });
    await audit({ userId: admin.id, action: "team.remove_from_season", entity: "Team", entityId: tid });
    revalidateAll();
  });
}

export async function addEvenings(seasonId: string, input: unknown) {
  return run(async () => {
    const admin = await requireAdmin();
    const sid = id.parse(seasonId);
    const p = z.object({ from: isoDate, to: isoDate.optional().or(z.literal("")) }).safeParse(input);
    if (!p.success) throw new UserError("Ongeldige datum");
    const dates = p.data.to ? saturdaysBetween(p.data.from, p.data.to) : [p.data.from];
    if (dates.length === 0) throw new UserError("Geen zaterdagen in deze periode");
    if (dates.length > 60) throw new UserError("Maximaal 60 avonden tegelijk");
    const res = await prisma.evening.createMany({
      data: dates.map((d) => ({ seasonId: sid, date: new Date(`${d}T00:00:00Z`) })),
      skipDuplicates: true,
    });
    await audit({ userId: admin.id, action: "evening.add", entity: "Season", entityId: sid, details: { dates } });
    revalidateAll();
    return res.count;
  });
}

export async function deleteEvening(eveningId: string) {
  return run(async () => {
    const admin = await requireAdmin();
    const eid = id.parse(eveningId);
    const scored = await prisma.match.count({ where: { fixture: { eveningId: eid }, status: { not: "OPEN" } } });
    if (scored > 0) throw new UserError("Deze avond heeft al uitslagen");
    await prisma.evening.delete({ where: { id: eid } });
    await audit({ userId: admin.id, action: "evening.delete", entity: "Evening", entityId: eid });
    revalidateAll();
  });
}

const pairingSchema = z.object({
  eveningId: id,
  slot: z.enum(["EARLY", "LATE"]),
  homeTeamId: id,
  awayTeamId: id,
});

/** Adds a pairing to an evening and creates its 8 matches. */
export async function addPairing(input: unknown) {
  return run(async () => {
    const admin = await requireAdmin();
    const p = pairingSchema.safeParse(input);
    if (!p.success) throw new UserError("Kies een tijdslot en twee teams");
    const evening = await prisma.evening.findUnique({
      where: { id: p.data.eveningId },
      include: { season: { include: { teams: true } }, fixtures: true },
    });
    if (!evening) throw new UserError("Avond niet gevonden");
    const seasonTeams = new Set(evening.season.teams.map((t) => t.teamId));
    if (!seasonTeams.has(p.data.homeTeamId) || !seasonTeams.has(p.data.awayTeamId)) throw new UserError("Team doet niet mee dit seizoen");
    const all = [...evening.fixtures.map((f) => ({ slot: f.slot, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId })), p.data];
    const err = validatePairings(all, evening.season.courts);
    if (err) throw new UserError(err);

    const fixture = await prisma.fixture.create({
      data: {
        eveningId: evening.id,
        slot: p.data.slot,
        homeTeamId: p.data.homeTeamId,
        awayTeamId: p.data.awayTeamId,
        matches: { create: FIXTURE_TEMPLATE.map((m) => ({ number: m.number, block: m.block, type: m.type })) },
      },
    });
    await audit({ userId: admin.id, action: "fixture.create", entity: "Fixture", entityId: fixture.id, details: p.data });
    revalidateAll();
  });
}

export async function deletePairing(fixtureId: string) {
  return run(async () => {
    const admin = await requireAdmin();
    const fid = id.parse(fixtureId);
    const scored = await prisma.match.count({ where: { fixtureId: fid, status: { not: "OPEN" } } });
    if (scored > 0) throw new UserError("Er zijn al uitslagen ingevoerd voor deze wedstrijd");
    await prisma.fixture.delete({ where: { id: fid } });
    await audit({ userId: admin.id, action: "fixture.delete", entity: "Fixture", entityId: fid });
    revalidateAll();
  });
}

export type AdminInviteResult = { existing: boolean; link: string | null; whatsapp: string | null; emailed: boolean };

/**
 * Makes someone an administrator. An existing account is promoted directly; for a new email
 * an account is created and a one-time "set password" link (7 days) is returned and emailed.
 */
export async function addAdmin(input: unknown) {
  return run<AdminInviteResult>(async () => {
    const admin = await requireAdmin();
    const p = z
      .object({
        email: z.email("Ongeldig e-mailadres").max(200).transform((e) => e.toLowerCase().trim()),
        name: z.string().trim().max(60).optional(),
      })
      .safeParse(input);
    if (!p.success) throw new UserError(p.error.issues[0].message);
    const { email, name } = p.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.isAdmin) throw new UserError("Deze persoon is al beheerder");
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { isAdmin: true } });
      await audit({ userId: admin.id, action: "admin.add", entity: "User", entityId: existing.id, details: { email } });
      revalidatePath("/admin/admins");
      return { existing: true, link: null, whatsapp: null, emailed: false };
    }

    const user = await prisma.user.create({ data: { email, name: name || null, isAdmin: true } });
    const { token, hash } = newToken();
    await prisma.passwordResetToken.create({
      data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    const link = `${appUrl()}/reset-password/${token}`;
    const text = `🎾 ${admin.name ?? "De beheerder"} heeft je beheerder gemaakt van de WinterTennis competitie. Stel via de link je wachtwoord in en log daarna in met ${email}. De link is 7 dagen geldig.`;
    let emailed = false;
    if (mailConfigured()) {
      emailed = await sendMail({ to: email, subject: "Je bent beheerder van WinterTennis", text, linkLabel: "Wachtwoord instellen", link }).catch(
        () => false,
      );
    }
    await audit({ userId: admin.id, action: "admin.add", entity: "User", entityId: user.id, details: { email, created: true } });
    revalidatePath("/admin/admins");
    return { existing: false, link, whatsapp: whatsappUrl(text, link), emailed };
  });
}

export async function removeAdmin(userId: string) {
  return run(async () => {
    const admin = await requireAdmin();
    const uid = id.parse(userId);
    if (uid === admin.id) throw new UserError("Je kunt jezelf niet als beheerder verwijderen");
    const count = await prisma.user.count({ where: { isAdmin: true } });
    if (count <= 1) throw new UserError("Er moet minimaal één beheerder overblijven");
    await prisma.user.update({ where: { id: uid }, data: { isAdmin: false } });
    await audit({ userId: admin.id, action: "admin.remove", entity: "User", entityId: uid });
    revalidatePath("/admin/admins");
  });
}
