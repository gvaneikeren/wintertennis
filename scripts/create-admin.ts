// Usage: npm run create-admin -- <email> [name]
// Creates the user if needed, marks it admin and prints a one-time password-set link.
import { PrismaClient } from "@prisma/client";
import { newToken } from "../src/lib/server/tokens";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const name = process.argv[3] ?? "Beheerder";
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run create-admin -- <email> [name]");
    process.exit(1);
  }
  const user = await prisma.user.upsert({ where: { email }, update: { isAdmin: true }, create: { email, name, isAdmin: true } });
  const { token, hash } = newToken();
  await prisma.passwordResetToken.create({ data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  console.log(`Admin: ${email}`);
  console.log(`Stel een wachtwoord in (24 uur geldig): ${base}/reset-password/${token}`);
  console.log("Of log direct in met Google met hetzelfde e-mailadres.");
}

main().finally(() => prisma.$disconnect());
