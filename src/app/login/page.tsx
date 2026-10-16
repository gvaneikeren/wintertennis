import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { GoogleIcon } from "@/components/google-button";
import { googleEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { googleLoginAction } from "@/app/actions/auth";
import { LoginForm, ResetRequestForm } from "./forms";

export const metadata: Metadata = { title: "Inloggen" };

const ERRORS: Record<string, string> = {
  noaccess: "Geen toegang – vraag je aanvoerder om een uitnodiging.",
  unverified: "Je Google-account heeft geen geverifieerd e-mailadres.",
  invite: "Deze uitnodiging is ongeldig of verlopen.",
  OAuthAccountNotLinked: "Dit e-mailadres is al gekoppeld aan een ander account.",
  AccessDenied: "Geen toegang – vraag je aanvoerder om een uitnodiging.",
};

type Props = { searchParams: Promise<{ next?: string; error?: string; reset?: string; forgot?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await getCurrentUser()) redirect(next);
  const error = sp.error ? (ERRORS[sp.error] ?? "Inloggen is mislukt. Probeer het opnieuw.") : null;

  return (
    <div className="mx-auto max-w-sm pt-4">
      <h1 className="text-2xl font-bold tracking-tight">{sp.forgot ? "Wachtwoord vergeten" : "Inloggen"}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        {sp.forgot ? "We sturen je een link om een nieuw wachtwoord in te stellen." : "Voor aanvoerders en teamleden."}
      </p>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {sp.reset && <Alert tone="brand">Je wachtwoord is gewijzigd. Log in met je nieuwe wachtwoord.</Alert>}
        <Card className="space-y-4 p-5">
          {sp.forgot ? (
            <ResetRequestForm />
          ) : (
            <>
              {googleEnabled && (
                <>
                  <form action={googleLoginAction}>
                    <input type="hidden" name="next" value={next} />
                    <button className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface font-semibold hover:bg-surface-2">
                      <GoogleIcon /> Doorgaan met Google
                    </button>
                  </form>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="h-px flex-1 bg-border" /> of <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}
              <LoginForm next={next} />
            </>
          )}
        </Card>
        <p className="text-center text-sm text-muted">
          Nog geen account? Je aanvoerder stuurt je een uitnodiging via WhatsApp of e-mail.
        </p>
      </div>
    </div>
  );
}
