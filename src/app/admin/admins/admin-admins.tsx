"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle, UserMinus } from "lucide-react";
import { Alert, Button, Card, Field, Input, buttonClass } from "@/components/ui";
import { addAdmin, removeAdmin, type AdminInviteResult } from "@/app/actions/admin";

export function AddAdminForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<AdminInviteResult | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const r = await addAdmin({ email, name });
      if (!r.ok) return void toast.error(r.error);
      const data = r.data!;
      if (data.existing) toast.success(`${email} is nu beheerder`);
      else setResult(data);
      setEmail("");
      setName("");
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result!.link!);
      toast.success("Link gekopieerd");
    } catch {
      toast.error("Kopiëren lukte niet");
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="text-sm font-semibold">Beheerder toevoegen</div>
      <p className="text-sm text-muted">
        Heeft de persoon al een account (bijv. als aanvoerder)? Dan wordt die direct beheerder. Anders krijgt hij of zij een link om een
        wachtwoord in te stellen.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="E-mailadres">
          <Input type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Naam (optioneel)">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <Button size="lg" disabled={pending || !email}>
          Beheerder maken
        </Button>
      </form>
      {result?.link && (
        <div className="space-y-2 pt-2">
          <Alert tone="brand">
            Account aangemaakt{result.emailed ? " en e-mail verstuurd" : ""}. Deel de link om een wachtwoord in te stellen (7 dagen geldig, één keer
            te gebruiken).
          </Alert>
          <div className="truncate rounded-xl bg-surface-2 px-3 py-2.5 font-mono text-xs">{result.link}</div>
          <div className="grid grid-cols-2 gap-2">
            <a href={result.whatsapp!} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <Button variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" /> Kopieer link
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function RemoveAdminButton({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${name} geen beheerder meer maken`}
      disabled={pending}
      onClick={() =>
        confirm(`${name} geen beheerder meer maken?`) &&
        start(async () => {
          const r = await removeAdmin(userId);
          if (r.ok) toast.success("Beheerder verwijderd");
          else toast.error(r.error);
        })
      }
    >
      <UserMinus className="h-4 w-4" />
    </Button>
  );
}
