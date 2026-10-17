"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, Button, Field, Input } from "@/components/ui";
import { acceptInviteAction, registerWithInviteAction } from "@/app/actions/auth";

export function RegisterForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(registerWithInviteAction, undefined);
  // Controlled inputs: React resets uncontrolled form fields after an action, which would wipe them on an error.
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const bind = (k: keyof typeof values) => ({ value: values[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value })) });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Naam">
        <Input name="name" autoComplete="name" required maxLength={60} {...bind("name")} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" inputMode="email" required {...bind("email")} />
      </Field>
      <Field label="Wachtwoord" hint="Minimaal 10 tekens">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required {...bind("password")} />
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
