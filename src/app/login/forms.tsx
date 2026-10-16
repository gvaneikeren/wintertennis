"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { loginAction, requestPasswordResetAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [email, setEmail] = useState(""); // controlled so it survives a failed attempt
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Wachtwoord">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button size="lg" disabled={pending}>
        {pending ? "Bezig…" : "Inloggen"}
      </Button>
      <Link href="/login?forgot=1" className="block text-center text-sm font-medium text-brand">
        Wachtwoord vergeten?
      </Link>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.message && <Alert tone="brand">{state.message}</Alert>}
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Button size="lg" disabled={pending}>
        Verstuur link
      </Button>
      <Link href="/login" className="block text-center text-sm font-medium text-brand">
        Terug naar inloggen
      </Link>
    </form>
  );
}
