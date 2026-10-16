"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { Alert, Button, Field, Input, buttonClass } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { cn } from "@/lib/cn";
import { createInvite, type InviteResult } from "@/app/actions/team";

type Channel = "WHATSAPP" | "EMAIL" | "LINK";

/** Invite button + sheet: send by WhatsApp, email, or share/copy a link. */
export function InviteShare({
  teamId,
  teamName,
  role,
  label,
  variant = "primary",
}: {
  teamId: string;
  teamName: string;
  role: "CAPTAIN" | "MEMBER";
  label: string;
  variant?: "primary" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<InviteResult | null>(null);
  const [pending, start] = useTransition();

  const reset = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setResult(null);
      setValue("");
    }
  };

  const create = () =>
    start(async () => {
      const res = await createInvite({
        teamId,
        role,
        channel,
        email: channel === "EMAIL" ? value : undefined,
        phone: channel === "WHATSAPP" ? value : undefined,
      });
      if (!res.ok) return void toast.error(res.error);
      setResult(res.data!);
      if (res.data!.emailed) toast.success("Uitnodiging verstuurd per e-mail");
    });

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      toast.success("Link gekopieerd");
    } catch {
      toast.error("Kopiëren lukte niet");
    }
  };

  const share = async () => {
    if (!result) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Uitnodiging ${teamName}`, text: result.text, url: result.link });
      } catch {
        /* cancelled */
      }
    } else copy();
  };

  const tabs: { id: Channel; label: string; icon: typeof Mail }[] = [
    { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
    { id: "EMAIL", label: "E-mail", icon: Mail },
    { id: "LINK", label: "Link", icon: Link2 },
  ];

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet
        open={open}
        onOpenChange={reset}
        title={role === "CAPTAIN" ? `Aanvoerder uitnodigen` : `Teamlid uitnodigen`}
        description={`Voor team ${teamName}. De link is 7 dagen geldig en werkt één keer.`}
      >
        {!result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={channel === id}
                  onClick={() => setChannel(id)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold",
                    channel === id ? "bg-surface shadow-sm" : "text-muted",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            {channel === "WHATSAPP" && (
              <Field label="Mobiel nummer (optioneel)" hint="Leeg laten? Dan kies je zelf het contact in WhatsApp.">
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12345678" value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
            )}
            {channel === "EMAIL" && (
              <Field label="E-mailadres">
                <Input type="email" inputMode="email" placeholder="naam@voorbeeld.nl" value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
            )}
            {channel === "LINK" && <p className="text-sm text-muted">Maak een link die je zelf deelt, bijvoorbeeld in de teamapp.</p>}
            <Button size="lg" onClick={create} disabled={pending || (channel === "EMAIL" && !value)}>
              {channel === "EMAIL" ? "Verstuur e-mail" : "Maak uitnodiging"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert tone="brand">Uitnodiging aangemaakt{result.emailed ? " en verstuurd" : ""}.</Alert>
            <div className="truncate rounded-xl bg-surface-2 px-3 py-2.5 font-mono text-xs">{result.link}</div>
            <a href={result.whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
              <MessageCircle className="h-5 w-5" /> Delen via WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" /> Kopieer link
              </Button>
              <Button variant="outline" onClick={share}>
                <Share2 className="h-4 w-4" /> Delen…
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
