import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { INVITE_COOKIE } from "@/auth";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { acceptInvite } from "@/lib/server/invites";

/** Finishes an invite after the Google OAuth round-trip. */
export async function GET(request: Request) {
  const jar = await cookies();
  const token = jar.get(INVITE_COOKIE)?.value;
  jar.delete(INVITE_COOKIE);
  const user = await getCurrentUser();
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!user) return to("/login");
  if (!token) return to("/team");
  try {
    await acceptInvite(user.id, token);
    return to("/team");
  } catch {
    return to("/team?invite=invalid");
  }
}
