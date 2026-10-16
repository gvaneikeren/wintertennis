import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { GoogleIcon } from "@/components/google-button";
import { googleEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { findValidInvite } from "@/lib/server/invites";
import { googleInviteAction } from "@/app/actions/auth";
import { nl } from "@/lib/nl";
import { AcceptButton, RegisterForm } from "./forms";

export const metadata: Metadata = { title: "Uitnodiging", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, user] = await Promise.all([findValidInvite(token), getCurrentUser()]);

  if (!invite) {
    return (
      <div className="mx-auto max-w-sm space-y-4 pt-4">
        <h1 className="text-2xl font-bold">Uitnodiging</h1>
        <Alert>Deze uitnodiging is ongeldig, al gebruikt of verlopen. Vraag om een nieuwe link.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm pt-2">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ball text-3xl shadow-inner" aria-hidden>
          🎾
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welkom bij {invite.team.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {invite.createdBy.name ? `${invite.createdBy.name} nodigt je uit` : "Je bent uitgenodigd"} als{" "}
          <strong>{nl.role[invite.role].toLowerCase()}</strong>.
        </p>
      </div>

      {user ? (
        <Card className="space-y-4 p-5">
          <p className="text-sm">
            Je bent ingelogd als <strong>{user.name ?? user.email}</strong>.
          </p>
          <AcceptButton token={token} teamName={invite.team.name} />
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
          {googleEnabled && (
            <>
              <form action={googleInviteAction}>
                <input type="hidden" name="token" value={token} />
                <button className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface font-semibold hover:bg-surface-2">
                  <GoogleIcon /> Doorgaan met Google
                </button>
              </form>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" /> of maak een account <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          <RegisterForm token={token} email={invite.email ?? ""} />
          <p className="text-center text-sm text-muted">
            Al een account?{" "}
            <Link href={`/login?next=/invite/${encodeURIComponent(token)}`} className="font-semibold text-brand">
              Log in
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}
