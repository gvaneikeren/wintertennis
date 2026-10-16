import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "./db";

export class AuthError extends Error {
  constructor(message = "Geen toegang") {
    super(message);
  }
}

/** The logged-in user with team memberships, loaded fresh from the DB (never trusted from the JWT). */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      memberships: { select: { teamId: true, role: true, team: { select: { id: true, name: true } } } },
    },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Log eerst in");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new AuthError();
  return user;
}

export function isMember(user: CurrentUser, teamId: string) {
  return user.memberships.some((m) => m.teamId === teamId);
}

export function isCaptain(user: CurrentUser, teamId: string) {
  return user.memberships.some((m) => m.teamId === teamId && m.role === "CAPTAIN");
}

export async function requireTeamMember(teamId: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isMember(user, teamId) && !user.isAdmin) throw new AuthError();
  return user;
}

export async function requireCaptain(teamId: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isCaptain(user, teamId) && !user.isAdmin) throw new AuthError();
  return user;
}

/**
 * Resolves which side of a match the user acts for. The team is always derived from the
 * fixture in the database, never from client input.
 */
export async function requireMatchParticipant(matchId: string) {
  const user = await requireUser();
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { fixture: { select: { id: true, homeTeamId: true, awayTeamId: true } } },
  });
  if (!match) throw new AuthError("Wedstrijd niet gevonden");
  const { homeTeamId, awayTeamId } = match.fixture;
  const side: "HOME" | "AWAY" | null = isMember(user, homeTeamId) ? "HOME" : isMember(user, awayTeamId) ? "AWAY" : null;
  if (!side && !user.isAdmin) throw new AuthError();
  const teamId = side === "HOME" ? homeTeamId : side === "AWAY" ? awayTeamId : null;
  return { user, match, side, teamId };
}

/** Action result type shared by all server actions. */
export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Wraps a server action body: converts AuthError and validation errors into an ActionResult. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AuthError || e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };
  }
}

/** An error whose message is safe to show to the user. */
export class UserError extends Error {}
