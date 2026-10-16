"use server";

import { AuthError as NextAuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVITE_COOKIE, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/server/db";
import { getCurrentUser, UserError, run } from "@/lib/server/auth-guards";
import { hashPassword, passwordProblem } from "@/lib/server/passwords";
import { acceptInvite, findValidInvite } from "@/lib/server/invites";
import { rateLimit } from "@/lib/server/rate-limit";
import { clientIp } from "@/lib/server/request";
import { audit } from "@/lib/server/audit";
import { hashToken, newToken } from "@/lib/server/tokens";
import { appUrl, sendMail } from "@/lib/server/mail";

export type FormState = { error?: string; message?: string } | undefined;

/** Only allow relative redirects to prevent open redirects. */
function safeRedirect(target: unknown, fallback = "/"): string {
  return typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: safeRedirect(form.get("next")),
    });
  } catch (e) {
    if (e instanceof NextAuthError) {
      if (e.type === "CredentialsSignin" && (e as { code?: string }).code === "rate_limited")
        return { error: "Te veel pogingen. Probeer het over 15 minuten opnieuw." };
      return { error: "E-mail of wachtwoord onjuist" };
    }
    throw e; // NEXT_REDIRECT
  }
}

export async function googleLoginAction(form: FormData) {
  await signIn("google", { redirectTo: safeRedirect(form.get("next")) });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

const registerSchema = z.object({
  token: z.string().min(10).max(100),
  name: z.string().trim().min(2, "Vul je naam in").max(60),
  email: z.email("Ongeldig e-mailadres").max(200).transform((e) => e.toLowerCase().trim()),
  password: z.string().max(200),
});

export async function registerWithInviteAction(_: FormState, form: FormData): Promise<FormState> {
  const p = registerSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { token, name, email, password } = p.data;
  if (!(await rateLimit(`register:${await clientIp()}`, 10, 60 * 60))) return { error: "Te veel pogingen, probeer het later opnieuw" };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (!(await findValidInvite(token))) return { error: "Deze uitnodiging is ongeldig of verlopen" };
  if (await prisma.user.findUnique({ where: { email } }))
    return { error: "Er bestaat al een account met dit e-mailadres. Log eerst in en open de link opnieuw." };

  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  try {
    await acceptInvite(user.id, token);
  } catch (e) {
    await prisma.user.delete({ where: { id: user.id } });
    return { error: e instanceof UserError ? e.message : "Er ging iets mis" };
  }
  await audit({ userId: user.id, action: "user.register", ip: await clientIp() });
  try {
    await signIn("credentials", { email, password, redirectTo: "/team" });
  } catch (e) {
    if (e instanceof NextAuthError) redirect("/login");
    throw e;
  }
}

/** For a user who is already logged in. */
export async function acceptInviteAction(token: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);
  const res = await run(() => acceptInvite(user.id, token));
  if (!res.ok) return res;
  redirect("/team");
}

/** Remembers the invite during the Google round-trip; /invite/accept consumes it afterwards. */
export async function googleInviteAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!(await findValidInvite(token))) redirect("/login?error=invite");
  (await cookies()).set(INVITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  await signIn("google", { redirectTo: "/invite/accept" });
}

export async function requestPasswordResetAction(_: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").toLowerCase().trim());
  const generic = { message: "Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met een link." };
  if (!email.success) return { error: "Ongeldig e-mailadres" };
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 60 * 60))) return generic;
  const user = await prisma.user.findUnique({ where: { email: email.data } });
  if (user) {
    const { token, hash } = newToken();
    await prisma.passwordResetToken.create({ data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await sendMail({
      to: user.email,
      subject: "Wachtwoord opnieuw instellen – WinterTennis",
      text: "Je hebt gevraagd om je wachtwoord opnieuw in te stellen. De link is 1 uur geldig. Heb je dit niet gevraagd? Dan kun je deze e-mail negeren.",
      linkLabel: "Nieuw wachtwoord instellen",
      link: `${appUrl()}/reset-password/${token}`,
    }).catch((e) => console.error("reset mail failed", e));
    await audit({ userId: user.id, action: "password.reset_requested", ip: await clientIp() });
  }
  return generic; // same answer whether or not the account exists
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { error: "Deze link is ongeldig of verlopen" };
  const used = await prisma.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count !== 1) return { error: "Deze link is al gebruikt" };
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } });
  await audit({ userId: record.userId, action: "password.reset", ip: await clientIp() });
  redirect("/login?reset=1");
}
