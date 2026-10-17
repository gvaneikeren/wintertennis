import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { LoginForm, ResetRequestForm } from "./forms";

export const metadata: Metadata = { title: "Inloggen" };

const ERRORS: Record<string, string> = {
  invite: "Deze uitnodiging is ongeldig of verlopen.",
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
            <LoginForm next={next} />
          )}
        </Card>
        <p className="text-center text-sm text-muted">
          Nog geen account? Je aanvoerder stuurt je een uitnodiging via WhatsApp of e-mail.
        </p>
        <p className="text-center text-sm">
          <Link href="/help" className="inline-flex min-h-11 items-center font-semibold text-brand">
            Hulp nodig? Bekijk de uitleg
          </Link>
        </p>
      </div>
    </div>
  );
}
