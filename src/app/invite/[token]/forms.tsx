"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, Button, Field, Input } from "@/components/ui";
import { acceptInviteAction, registerWithInviteAction } from "@/app/actions/auth";

export function RegisterForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(registerWithInviteAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Naam">
        <Input name="name" autoComplete="name" required maxLength={60} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" inputMode="email" defaultValue={email} required />
      </Field>
      <Field label="Wachtwoord" hint="Minimaal 10 tekens">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Button size="lg" disabled={pending}>
        {pending ? "Bezig…" : "Account aanmaken"}
      </Button>
    </form>
  );
}

export function AcceptButton({ token, teamName }: { token: string; teamName: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInviteAction(token);
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      Lid worden van {teamName}
    </Button>
  );
}
