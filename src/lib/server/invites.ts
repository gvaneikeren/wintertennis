import { prisma } from "./db";
import { hashToken } from "./tokens";
import { audit } from "./audit";
import { UserError } from "./auth-guards";

export async function findValidInvite(token: string) {
  if (!token || token.length > 100) return null;
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

/** Adds the user to the invite's team with the invited role and consumes the invite (single use). */
export async function acceptInvite(userId: string, token: string) {
  const invite = await findValidInvite(token);
  if (!invite) throw new UserError("Deze uitnodiging is ongeldig of verlopen");
  await prisma.$transaction(async (tx) => {
    // Conditional update makes the token single-use even with concurrent requests.
    const used = await tx.invite.updateMany({ where: { id: invite.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (used.count !== 1) throw new UserError("Deze uitnodiging is al gebruikt");
    const existing = await tx.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId: invite.teamId } } });
    if (!existing) {
      await tx.teamMembership.create({ data: { userId, teamId: invite.teamId, role: invite.role } });
    } else if (invite.role === "CAPTAIN" && existing.role !== "CAPTAIN") {
      await tx.teamMembership.update({ where: { userId_teamId: { userId, teamId: invite.teamId } }, data: { role: "CAPTAIN" } });
    }
  });
  await audit({ userId, action: "invite.accept", entity: "Invite", entityId: invite.id, details: { teamId: invite.teamId, role: invite.role } });
  return invite;
}
