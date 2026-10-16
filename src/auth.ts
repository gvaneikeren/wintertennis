import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { dummyHash, verifyPassword } from "@/lib/server/passwords";
import { rateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/audit";
import { hashToken } from "@/lib/server/tokens";

export const INVITE_COOKIE = "wt_invite";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

const credentialsSchema = z.object({
  email: z.email().max(200).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(200),
});

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw, request) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
      if (!(await rateLimit(`login:${ip}:${email}`, 5, 15 * 60))) {
        await audit({ action: "login.rate_limited", details: { email }, ip });
        throw new RateLimited();
      }
      const user = await prisma.user.findUnique({ where: { email } });
      // Always run bcrypt so response time does not reveal whether the account exists.
      const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
      if (!user || !user.passwordHash || !ok) {
        await audit({ userId: user?.id, action: "login.failed", details: { email }, ip });
        return null;
      }
      await audit({ userId: user.id, action: "login.success", details: { method: "password" }, ip });
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (googleEnabled) {
  // Linking a Google account to an existing user with the same email is safe because
  // we only accept Google accounts whose email Google has verified (see signIn callback).
  providers.push(Google({ allowDangerousEmailAccountLinking: true }));
}

/** True when the browser carries a valid, unused invite token (set on /invite/[token]). */
async function hasValidInviteCookie(): Promise<boolean> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!token) return false;
  const invite = await prisma.invite.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(invite && !invite.acceptedAt && !invite.revokedAt && invite.expiresAt > new Date());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || profile.email_verified !== true) return "/login?error=unverified";
      const existing = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
      if (existing || (await hasValidInviteCookie())) {
        await audit({ userId: existing?.id ?? user.id, action: "login.success", details: { method: "google" } });
        return true;
      }
      // Invite-only: no account and no invite means no access.
      await audit({ action: "login.no_access", details: { email: profile.email, method: "google" } });
      return "/login?error=noaccess";
    },
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});
