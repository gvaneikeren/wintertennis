import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { dummyHash, verifyPassword } from "@/lib/server/passwords";
import { rateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/audit";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

const credentialsSchema = z.object({
  email: z.email().max(200).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  providers: [
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
        await audit({ userId: user.id, action: "login.success", ip });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
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
