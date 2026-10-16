"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { resetPasswordAction } from "@/app/actions/auth";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Nieuw wachtwoord" hint="Minimaal 10 tekens">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Button size="lg" disabled={pending}>
        Opslaan
      </Button>
    </form>
  );
}
