"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Link2, Pencil, Send, Settings, UserPlus, Users, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Button, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getFlag, setFlag, storageAvailable } from "@/lib/local-flag";

export type WelcomeRole = "captain" | "member" | "admin" | "none";

type Page = { icon: LucideIcon; title: string; text: string };

const PAGES: Record<WelcomeRole, Page[]> = {
  captain: [
    { icon: UserPlus, title: "1. Zet je spelers erin", text: "Ga naar Mijn team en voeg minimaal 4 dames en 4 heren toe. Invallers voeg je gewoon toe als extra speler." },
    { icon: Send, title: "2. Nodig je teamgenoten uit", text: "Met + Uitnodigen stuur je een link via WhatsApp of e-mail. Dan kunnen zij ook uitslagen invoeren en goedkeuren." },
    { icon: Pencil, title: "3. Op de speelavond", text: "Open de wedstrijd, vul per partij de Opstelling in en daarna de Uitslag. De tegenstander keurt je uitslag goed." },
  ],
  member: [
    { icon: Link2, title: "1. Koppel jezelf", text: "Ga naar Mijn team en tik bij je eigen naam op Dit ben ik." },
    { icon: Pencil, title: "2. Uitslag invoeren", text: "Open de wedstrijd, tik bij een partij op Uitslag invoeren en zet de games met − en +." },
    { icon: CheckCircle2, title: "3. Goedkeuren", text: "Heeft de tegenstander een uitslag ingevoerd? Op Home staat dan Actie nodig. Tik op Akkoord of Betwisten." },
  ],
  admin: [
    { icon: Settings, title: "1. Seizoen", text: "Ga naar Beheer en maak een seizoen aan met het aantal banen." },
    { icon: Users, title: "2. Teams en aanvoerders", text: "Voeg bij Beheer → Teams de teams toe en nodig per team een aanvoerder uit." },
    { icon: CalendarDays, title: "3. Programma", text: "Voeg bij Beheer → Programma de zaterdagen toe en plan wie tegen wie speelt." },
  ],
  none: [],
};

const INTRO: Record<WelcomeRole, string> = {
  captain: "Als aanvoerder regel je je team in drie stappen.",
  member: "Zo help je je team met de uitslagen.",
  admin: "Als beheerder zet je de competitie klaar.",
  none: "",
};

/** Shown once per user per device after the first login. */
export function WelcomeSheet({ userId, role, firstName }: { userId: string; role: WelcomeRole; firstName: string | null }) {
  const key = `wt:welcome:${userId}`;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pages = PAGES[role];

  useEffect(() => {
    if (pages.length > 0 && storageAvailable() && !getFlag(key)) setOpen(true);
  }, [key, pages.length]);

  const close = () => {
    setFlag(key);
    setOpen(false);
  };
  if (pages.length === 0) return null;
  const last = page === pages.length - 1;
  const { icon: Icon, title, text } = pages[page];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
      title={`Welkom${firstName ? `, ${firstName}` : ""}! 🎾`}
      description={INTRO[role]}
    >
      <div className="space-y-5" data-welcome={role}>
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl bg-brand-soft/60 p-5 text-center" aria-live="polite">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-fg">
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-base font-bold">{title}</p>
          <p className="text-sm text-fg/80">{text}</p>
        </div>
        <div className="flex justify-center gap-2" aria-hidden>
          {pages.map((_, i) => (
            <span key={i} className={cn("h-2 rounded-full transition-all motion-reduce:transition-none", i === page ? "w-6 bg-brand" : "w-2 bg-border")} />
          ))}
        </div>
        <div className="flex gap-2">
          {page > 0 && (
            <Button variant="secondary" size="lg" className="w-auto flex-1" onClick={() => setPage(page - 1)}>
              Terug
            </Button>
          )}
          <Button size="lg" className="w-auto flex-[2]" onClick={() => (last ? close() : setPage(page + 1))}>
            {last ? "Aan de slag" : "Volgende"}
          </Button>
        </div>
        <Link href="/help" onClick={close} className={cn(buttonClass("ghost", "md"), "w-full text-brand")}>
          Bekijk de volledige uitleg
        </Link>
      </div>
    </Sheet>
  );
}
