"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { requireCaptain, requireTeamMember, requireUser, run, UserError } from "@/lib/server/auth-guards";
import { audit } from "@/lib/server/audit";
import { newToken } from "@/lib/server/tokens";
import { appUrl, mailConfigured, sendMail } from "@/lib/server/mail";
import { rateLimit } from "@/lib/server/rate-limit";
import { inviteText, normalizePhone, whatsappUrl } from "@/lib/invite-message";

const id = z.string().min(1).max(40);
const playerSchema = z.object({
  name: z.string().trim().min(2, "Naam is te kort").max(60, "Naam is te lang"),
  gender: z.enum(["F", "M"]),
});

export async function addPlayer(teamId: string, input: unknown) {
  return run(async () => {
    const tid = id.parse(teamId);
    const user = await requireTeamMember(tid);
    const p = playerSchema.safeParse(input);
    if (!p.success) throw new UserError(p.error.issues[0].message);
    const existing = await prisma.player.findUnique({ where: { teamId_name: { teamId: tid, name: p.data.name } } });
    if (existing?.active) throw new UserError("Deze speler bestaat al");
    const player = existing
      ? await prisma.player.update({ where: { id: existing.id }, data: { active: true, gender: p.data.gender } })
      : await prisma.player.create({ data: { teamId: tid, ...p.data } });
    await audit({ userId: user.id, action: "player.add", entity: "Player", entityId: player.id, details: p.data });
    revalidatePath("/team");
    return { id: player.id, name: player.name, gender: player.gender };
  });
}

export async function updatePlayer(playerId: string, input: unknown) {
  return run(async () => {
    const player = await prisma.player.findUnique({ where: { id: id.parse(playerId) } });
    if (!player) throw new UserError("Speler niet gevonden");
    const user = await requireCaptain(player.teamId);
    const p = playerSchema.safeParse(input);
    if (!p.success) throw new UserError(p.error.issues[0].message);
    await prisma.player.update({ where: { id: player.id }, data: p.data });
    await audit({ userId: user.id, action: "player.update", entity: "Player", entityId: player.id, details: p.data });
    revalidatePath("/team");
  });
}

/** Soft-deletes a player so past line-ups keep their names. */
export async function removePlayer(playerId: string) {
  return run(async () => {
    const player = await prisma.player.findUnique({ where: { id: id.parse(playerId) } });
    if (!player) throw new UserError("Speler niet gevonden");
    const user = await requireCaptain(player.teamId);
    await prisma.player.update({ where: { id: player.id }, data: { active: false } });
    await audit({ userId: user.id, action: "player.remove", entity: "Player", entityId: player.id });
    revalidatePath("/team");
  });
}

/** Links the logged-in user to a player of their own team ("dit ben ik"). */
export async function claimPlayer(playerId: string) {
  return run(async () => {
    const user = await requireUser();
    const player = await prisma.player.findUnique({ where: { id: id.parse(playerId) } });
    if (!player || !user.memberships.some((m) => m.teamId === player.teamId)) throw new UserError("Geen toegang");
    if (player.userId && player.userId !== user.id) throw new UserError("Deze speler is al gekoppeld aan een ander account");
    await prisma.$transaction([
      prisma.player.updateMany({ where: { teamId: player.teamId, userId: user.id }, data: { userId: null } }),
      prisma.player.update({ where: { id: player.id }, data: { userId: user.id } }),
    ]);
    revalidatePath("/team");
  });
}

const inviteSchema = z.object({
  teamId: id,
  role: z.enum(["CAPTAIN", "MEMBER"]),
  channel: z.enum(["EMAIL", "WHATSAPP", "LINK"]),
  email: z.union([z.email("Ongeldig e-mailadres").max(200), z.literal("")]).optional(),
  phone: z.string().max(30).optional(),
});

export type InviteResult = { link: string; whatsapp: string; emailed: boolean; text: string };

/**
 * Creates an invite. Captains invite members; only the admin can invite captains.
 * The raw token is returned once and never stored.
 */
export async function createInvite(input: unknown) {
  return run<InviteResult>(async () => {
    const p = inviteSchema.safeParse(input);
    if (!p.success) throw new UserError(p.error.issues[0].message);
    const { teamId, role, channel } = p.data;
    const email = p.data.email?.toLowerCase().trim() || null;
    const phone = p.data.phone?.trim() || null;
    // Captains (and admins) can invite; invitees from a captain get the same captain rights.
    const user = await requireCaptain(teamId);
    if (!(await rateLimit(`invite:${user.id}`, 30, 60 * 60))) throw new UserError("Te veel uitnodigingen, probeer het later opnieuw");
    if (channel === "EMAIL" && !email) throw new UserError("Vul een e-mailadres in");
    if (channel === "WHATSAPP" && phone && !normalizePhone(phone)) throw new UserError("Ongeldig telefoonnummer");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new UserError("Team niet gevonden");

    const { token, hash } = newToken();
    const invite = await prisma.invite.create({
      data: {
        tokenHash: hash,
        teamId,
        role,
        channel,
        email,
        phone,
        createdById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const link = `${appUrl()}/invite/${token}`;
    const text = inviteText(team.name, role, user.name);
    let emailed = false;
    if (channel === "EMAIL" && email) {
      if (!mailConfigured()) throw new UserError("E-mail is nog niet ingesteld. Gebruik WhatsApp of kopieer de link.");
      emailed = await sendMail({ to: email, subject: `Uitnodiging WinterTennis – ${team.name}`, text, linkLabel: "Uitnodiging accepteren", link });
    }
    await audit({ userId: user.id, action: "invite.create", entity: "Invite", entityId: invite.id, details: { teamId, role, channel } });
    revalidatePath("/team");
    revalidatePath("/admin/teams");
    return { link, whatsapp: whatsappUrl(text, link, phone), emailed, text };
  });
}

export async function revokeInvite(inviteId: string) {
  return run(async () => {
    const invite = await prisma.invite.findUnique({ where: { id: id.parse(inviteId) } });
    if (!invite) throw new UserError("Uitnodiging niet gevonden");
    const user = await requireCaptain(invite.teamId);
    await prisma.invite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
    await audit({ userId: user.id, action: "invite.revoke", entity: "Invite", entityId: invite.id });
    revalidatePath("/team");
    revalidatePath("/admin/teams");
  });
}

export async function setMemberRole(teamId: string, userId: string, role: "CAPTAIN" | "MEMBER") {
  return run(async () => {
    const tid = id.parse(teamId);
    const uid = id.parse(userId);
    const r = z.enum(["CAPTAIN", "MEMBER"]).parse(role);
    const actor = await requireCaptain(tid);
    if (r === "MEMBER" && uid === actor.id && !actor.isAdmin) {
      const captains = await prisma.teamMembership.count({ where: { teamId: tid, role: "CAPTAIN" } });
      if (captains <= 1) throw new UserError("Een team heeft minimaal één aanvoerder nodig");
    }
    await prisma.teamMembership.update({ where: { userId_teamId: { userId: uid, teamId: tid } }, data: { role: r } });
    await audit({ userId: actor.id, action: "member.role", entity: "Team", entityId: tid, details: { userId: uid, role: r } });
    revalidatePath("/team");
    revalidatePath("/admin/teams");
  });
}

export async function removeMember(teamId: string, userId: string) {
  return run(async () => {
    const tid = id.parse(teamId);
    const uid = id.parse(userId);
    const actor = await requireCaptain(tid);
    if (uid === actor.id) throw new UserError("Je kunt jezelf niet verwijderen");
    // Only the account's access is removed; players, line-ups and scores stay untouched.
    const removed = await prisma.teamMembership.deleteMany({ where: { userId: uid, teamId: tid } });
    if (removed.count === 0) throw new UserError("Dit lid zit niet (meer) in het team");
    await audit({ userId: actor.id, action: "member.remove", entity: "Team", entityId: tid, details: { userId: uid } });
    revalidatePath("/team");
    revalidatePath("/admin/teams");
  });
}
