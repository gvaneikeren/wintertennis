import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { findValidInvite } from "@/lib/server/invites";
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
